module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps : [

         {
            name      : 'SpreadSheetsImporter',
            script    : 'index.js',
            env: {
                NODE_ENV: 'development'
            },
            env_production : {
                NODE_ENV: 'production'
            },
            watch: true,
            // instances: "max",
            // exec_mode: "cluster",
            max_memory_restart : "1000M"
        }

    ],

    /*/!**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     *!/*/
    deploy : {
      production : {
        user : 'ebonet',
        host : '208.104.17.253',
        ref  : 'origin/master',
        repo : 'git@github.com:ACS-Lab/Sheets-importer.git',
        path : 'E:/Sheets-importer',
        'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
      },
      dev : {
        user : 'node',
        host : '127.0.0.1',
        ref  : 'origin/master',
        repo : 'git@github.com:ACS-Lab/Sheets-importer.git',
        path : 'C:/wamp64/www/sheetsV4',
        'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env dev',
        env  : {
          NODE_ENV: 'dev'
        }
      }
    }
};
