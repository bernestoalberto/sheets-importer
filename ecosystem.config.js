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
        user : 'node',
        host : '192.168.86.209',
        ref  : 'origin/master',
        repo : 'git@github.com:bernestoalberto/Sheets-importer.git',
        path : '/home/node/www/Sheets-importer',
        'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
      },
      dev : {
        user : 'node',
        host : '127.0.0.1',
        ref  : 'origin/master',
        repo : 'git@github.com:bernestoalberto/Sheets-importer.git',
        path : 'D:/repo/sheetsV4',
        'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env dev',
        env  : {
          NODE_ENV: 'dev'
        }
      }
    }
};
