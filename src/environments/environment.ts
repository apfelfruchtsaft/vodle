// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  logging: {
    logLevels: [
      {
        loggerName: "root",
        logLevel: "TRACE" // DEBUG or TRACE
      },
    ]  
  },
  data_service: {
    central_db_server_url: "http://localhost:5984/",
    central_db_password: "none",
    hash_n_bytes: 8,
    pid_length: 12,
    pwd_length: 12,
    oid_length: 8,
    vid_length: 8,
    did_length: 8
  },
  db_put_retry_delay_ms: 100,
  default_lang: "en",
  github_url: "https://github.com/pik-gane/vodle",
  magic_link_base_url: "http://localhost:8100/",
  support_vodle_url: "http://vodle.it/#support"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
