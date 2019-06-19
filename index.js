const fs = require('fs');
const readline = require('readline');
const nodecron = require('node-cron');
const {google} = require('googleapis');
const mysql2 = require('./database.js');
const mailer = require('./nodemail.js');
let GoogleSpreadsheet = require('google-spreadsheet');
let creds = require('./client_secret.json');
let moment = require('moment');
// Create a document object using the ID of the spreadsheet - obtained from its URL.
let doc = new GoogleSpreadsheet('1gWFg1MtadqFCnPa7_Sk4P1M6Ad811eE5c1oiHrnPnkU');

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

require('events').EventEmitter.defaultMaxListeners = 50;

let env = (process.env.COMPUTERNAME != "ACS-EBONET") ? 'production' : 'development';
console.log(`Running on ${env} mode`);
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    // authorize(JSON.parse(content), listMajors);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */

// Authenticate with the Google Spreadsheets API.
async function importOrders()
{
    let date = new Date();
    let month = date.getMonth() + 1;
    doc.useServiceAccountAuth(creds, function (err) {
        if (err) console.error(err);
        // Get all of the rows from the spreadsheet.
        doc.getRows(month + 1, async function (err, rows) {
            if (err) console.error(err);
            console.info('The worksheet for the month of '+ monthNames[date.getMonth()].toUpperCase() +' has ' + rows.length +' rows');

            for (let current of rows) {
                console.info(`The current order is ${current['order']}`);
                if(current['order'] != ""){
                    let resp = await existOnDB(current['order']);
                    await console.info(resp[0]);
                 if (resp.length == 0) {
                        let clientid = await getClientId(current['client']);
                        let specimenid = await getSpecimenTypeId(current['samplematrix']);
                        let ordernew = await createOrderonDB(current, clientid, specimenid);
                        if (ordernew.affectedRows == 1) {
                            let panels = await getPanels(current);
                            for (let panel of panels) {
                                let panelid = await getPanelId(panel);
                                let resultnew = await createResultEntry(current['order'], panelid, specimenid);
                                console.info('Updated ' + resultnew.affectedRows + ' for the panel' + panel);

                            }
                            email(`${current['order']} has been created `, 'The order # ', 'A new Order has been created from the Google SpreadSheets');
                        }
                        else {
                            console.info(`The order ${current['order']} has not been insert on DB`);
                        }
                    } else {
                        console.info(`The order ${current['order']} was found on DB`);
                    }
                }
                else{
                    console.info(`The pointer has arrived to the end of the file`);
                }
            }
        });
    });
}

nodecron.schedule('* 30 * * * 1,2,3,4,5', function () {
importOrders();
 });

// function listMajors(auth) {
//     const sheets = google.sheets({version: 'v4', auth});
//
//     let date = new Date();
//     let cd = monthNames[date.getMonth()].toUpperCase();
//     let rangec = `${cd}!A1:AM389`,
//         sheetid ='1gWFg1MtadqFCnPa7_Sk4P1M6Ad811eE5c1oiHrnPnkU';
//     sheets.spreadsheets.values.get({
//         spreadsheetId: sheetid,
//         range: rangec,
//         majorDimension: "ROWS"
//     }, async (err, res) => {
//         if (err) return console.log('The API returned an error: ' + err);
//         const rows = res.data.values;
//         if (rows.length) {
//             console.log(`Columns Range: ${rangec}`);
//             // Print columns A and E, which correspond to indices 0 and 4.
//             console.log(rows[0].toString());
//             for(let i=1 ; i < rows.length;i++){
//                 console.log(rows[i].toString());
//                 let current = rows[i];
//
//                 let resp = await existOnDB(current[4]);
//                 await console.log(resp);
//                 if (resp.length == 0) {
//                     let clientid = await getClientId(current[9]);
//                     let specimenid = await getSpecimenTypeId(current[8]);
//                     let ordernew = await createOrderonDB(current, clientid, specimenid);
//                     if (ordernew) {
//                         let panelid = await getPanelId(current[12]);
//                         let resultnew = await createResultEntry(current[4],panelid);
//                         console.log('Updated '+ resultnew.RowsAffected);
//                         email(`${current[4]} has been created ${rows.toString()}`, 'The order # ', 'A new Order has been created from the Google SpreadSheets');
//                     }
//                 }
//                 else {
//                     console.log(`The order ${current[4]} was found on DB`);
//                 }
//             }
//
//
//         }
//         else {
//             console.log('No data found.');
//         }
//     });
// }
function email(name, message, subjecto, flag=0){
    // 'use strict';
    let subject = `${subjecto}`;
    let body = `${message} ${name} `;
    let mailParam = {
        from: '"Do not reply "<no-reply@acslabcannabis.com>"',
        to: "ebonet@acslabtest.com",
        subject: (subject == 1 ) ? message: subject,
        text: body,
        html: body
    };
    /*if(user==='Administrator'){
        //  user = 'cbelotte';
    }*/
    mailParam.cc = [
        // (flag == 1 || subject ==1)? 'mlaping@acslabtest.com':'',
        //`${user}@acslabtest.com`
    ];
    mailer.sendMail(mailParam, 'The Server');
}
function getClientId(name) {
    let query =   `Select idclients from clients where  clientname like '%${name}%' limit 1`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            (response.length > 0) ? resolve(response[0]['idclients']) : resolve(false);
        });
    });

}
function getPanelId(name) {
    let query =   `Select idtestpanels from testpanels where  name like '%${name}%'`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            (response.length > 0) ? resolve(response[0]['idtestpanels']) :resolve(false) ;
        });
    });

}
function getDBPanels(){
    let query =   `Select idtestpanels,name from testpanels`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            resolve(response);
        });
    });
}
async function getPanels(object) {
    let panels = [];
    // let list = await getDBPanels();
    // for(let i = 0 ; i < list.length;i++)
    if(object.pot == 'X'){
        panels.push('Potency');
    }

    if(object['rsfull'] == 'X'){
        panels.push('Residual Solvents');
    }
    if(object['ter2'] == 'X'){
        panels.push('Terpenes 2');
    }
    if(object['pes'] == 'X'){
        panels.push('Pesticides');
    }
    if(object['my'] == 'X'){
        panels.push('Mycotoxins');
    }
    if(object['moisture'] == 'X'){
        panels.push('Moisture');
    }
    if(object['miqpcr'] == 'X'){
        panels.push('Microbiology (qPCR)');
    }
    if(object['wateractivity'] == 'X'){
        panels.push('Water Activity');
    }
    if(object['micronutrients'] == 'X'){
        panels.push('MicroNutrients');
    }
    if(object['wateractivity']  == 'X'){
        panels.push('Water Activity');
    }
    if(object['bloodthc']  == 'X'){
        panels.push('Blood THC');
    }
    if(object['pathogenicsalmonella']  == 'X'){
        panels.push('PATHOGENIC');
    }
    if(object['flavonoids']  == 'X'){
        panels.push('Flavonoids');
    }
    if(object['ethanol']  == 'X'){
        panels.push('Ethanol');
    }
    if(object['hm']  == 'X'){
        panels.push('Heavy Metals');
    }
    if(object['plantregulators']  == 'X'){
        panels.push('Plant Regulator');
    }
    /*     if(object['pathogenice.coli']  == 'X'){
            panels.push('Plant Regulator');
        }
         if(object['pathogeniclisteria']  == 'X'){
            panels.push('Plant Regulator');
        }
         if(object['ecolireflextestonly']  == 'X'){
            panels.push('Plant Regulator');
        }*/
    if(object['product-column']  == 'X'){
        panels.push('Plant Regulator');
    }

    return panels;
}
function getSpecimenTypeId(name) {
    let query =   `Select idspecimentypes from specimentypes where  name = '${name}'`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            (response.length > 0)? resolve(response[0]['idspecimentypes']): resolve(false);
        });
    });

}
function existOnDB(accession) {
    let query =   `Select * from orders where  idorders = '${accession}'`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            resolve(response);
        });
    });

}
function createResultEntry(orderid,panelid,specimentype){
    let table = (env == 'production')?'results':'resultst';
    let query = `INSERT INTO ${table}(orderid, testid, testname, panelid, unit) SELECT '${orderid}', c.compoundid, t.name, t.testpanelid, t.unit
    FROM testcompoundrel c LEFT JOIN tests t ON t.idtests = c.compoundid
    WHERE t.testpanelid = '${panelid}' AND t.specimentypeid = '${specimentype}'
    AND active= 'yes' GROUP BY c.compoundid ORDER BY compoundid`;
    return new Promise(resolve =>{
        mysql2.exec(query,null,function (response) {
            resolve(response);
        });
    });
}
function createOrderonDB(order,clientid, specimenid) {
    return new Promise(resolve =>{
        let table = (env == 'development') ? `orderst`: `orders` ;
        let date =moment(order['datereceived']);
         date = date.format();
        date = date.split('T');
        date = date[0];
        if(clientid &&  specimenid) {
            let batch = (order['batch'] == "N/A") ? " " :order['batch'];
            let query = `INSERT IGNORE INTO ${table}
        (idorders,batchno,description ,clientId,specimentype,orderdate,collectiondate ,receptiondate,source,status,receiver)
         VALUES('${order['order']}','${batch}','${order['description']}','${clientid}','${specimenid}',
                '${date}','${date}','${date}','${order['extractedfrom']}','${order['orderstatus']}','${order['collector']}')`;

            mysql2.exec(query, null, function (response) {
                resolve(response);
            });
        }
        else{
            console.info('Client or Specimen not valid for Order # ' + order['order']);
            resolve(false);
        }
    });
}
