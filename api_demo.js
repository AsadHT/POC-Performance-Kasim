import {group, sleep, fail, check} from "k6";
import {Trend} from "k6/metrics";
import encoding from "k6/encoding";

import { authAPI } from "./lib/auth_api.js"
import { crocodilesAPI } from "./lib/crocodiles_api.js"
import { publicAPI } from "./lib/public_api.js"


export const options = {

  scenarios: {
    demoWithTooManyCRUDs: {
      executor: 'ramping-vus',
      exec: 'demoWithTooManyCRUDs',
      stages: [
        { duration: '30s', target: 100 }, // fast ramp-up to a high point
        
        { duration: '1m', target: 100 }, // fast ramp-up to a high point
   
        { duration: '15s', target: 0 }, // quick ramp-down to 0 users
  ]
},
  demoWithTooLessCRUDs: {
    executor: 'ramping-vus',
    exec: 'demoWithTooLessCRUDs',
    startTime: '2m30s',
    stages: [
      { duration: '30s', target: 100 }, // fast ramp-up to a high point
        
      { duration: '1m', target: 100 }, // fast ramp-up to a high point

      { duration: '15s', target: 0 }, // quick ramp-down to 0 users
    ]  
  }

},
  thresholds: {
    "http_req_duration": ["p(95)<900"]
  },
};

function randomString(anysize) {
  let charset = "abcdefghijklmnopqrstuvwxyz";
  let res = '';
  while (anysize--) res += charset[Math.random() * charset.length | 0];
  return res;
}


const conf = {
  baseURL: __ENV.BASE_URL || "https://test-api.k6.io",
  username: `${randomString(20)}@example.com`,
  password: "superCroc2019"
}

let timeToFirstByte = new Trend("time_to_first_byte", true);


export function demoWithTooManyCRUDs() {
    const { baseURL, username, password } = conf;
    const auth = authAPI(baseURL);
    const crocs = crocodilesAPI(conf.baseURL)
    const pb = publicAPI(baseURL);

    let resp;

    if(__ITER === 0) {
         resp = auth.register({
            first_name: "Crocodile",
            last_name: "Owner",
            username,
            password,
            email: username,
        })
        check(resp, auth.registerChecks()) || fail(`could not register. Error: ${resp.body}`);
    }


    group("Public endpoints", () => {
      resp = pb.crocodiles()
      resp.map((r) => check(r, pb.crocodileChecks()))
    });

    group("Login", () => {
      resp = auth.cookieLogin({ username, password })
     

      check(
        resp, auth.cookieLoginChecks(username)
      ) || fail("could not log in");
      
      timeToFirstByte.add(resp.timings.waiting, {ttfbURL: resp.url});
    });

    let newCrocID;
    group("CreateRetrieve and modify crocodiles", () => {


      const crocData = {
        name: `Name ${randomString(10)}`,
        sex: "M",
        date_of_birth: "2001-01-01",
    }
        // create new croc
        resp = crocs.register(crocData,{ tags: { endpointType: "modifyCrocs", name: "Create Croc Operation " }});
        check(resp, crocs.registerChecks()) || fail(`Unable to create croc ${resp.status} ${resp.body}`);

    

       
        

       check(crocs.list(), crocs.listChecks()) || fail("could not get crocs")
       
      
       
        

        newCrocID = resp.json('id')

        resp = crocs.rename(newCrocID, "New name", {tags: {name: 'Update Croc Operation'}})
        check(resp, crocs.renameChecks("New name")) || fail(`Unable to update the croc ${resp.status} ${resp.body}`);

       

        
    });

    group("Delete and verify", () => {
        check(
          crocs.deregister(newCrocID, {tags: {name: 'Delete Croc Operation'}}), crocs.deregisterChecks()
        );

    //    resp = crocs.get(newCrocID, {tags: {name: 'Retrieve Deleted Croc'}});
    //    check(resp, {
    //      "crocNotFound": (r) => r.status === 404,
     //   }) || fail("croc was not deleted properly");
    });

    group("Log me out!", () => {
        check(auth.cookieLogout(), auth.cookieLogoutChecks())

        
   //     check(crocs.list(), {
   //       "got crocs": (r) => r.status === 401,
   //     }) || fail("ERROR: I'm still logged in!");

    });

   sleep(1)
}

export function demoWithTooLessCRUDs() {
  const { baseURL, username, password } = conf;
  const auth = authAPI(baseURL);
  const crocs = crocodilesAPI(conf.baseURL)
  const pb = publicAPI(baseURL);

  let resp;

  if(__ITER === 0) {
       resp = auth.register({
          first_name: "Crocodile",
          last_name: "Owner",
          username,
          password,
          email: username,
      })
      check(resp, auth.registerChecks()) || fail(`could not register. Error: ${resp.body}`);
  }


  group("Public endpoints", () => {
    resp = pb.crocodiles()
    resp.map((r) => check(r, pb.crocodileChecks()))
  });

  group("Login", () => {
    resp = auth.cookieLogin({ username, password })
   

    check(
      resp, auth.cookieLoginChecks(username)
    ) || fail("could not log in");
    
    timeToFirstByte.add(resp.timings.waiting, {ttfbURL: resp.url});
  });

  let newCrocID;
  group("Create, Retrieve, modify and delete crocodiles", () => {


    const crocData = {
      name: `Name ${randomString(10)}`,
      sex: "M",
      date_of_birth: "2001-01-01",
  }
      // create new croc
      resp = crocs.register(crocData,{ tags: { endpointType: "modifyCrocs", name: "Create Croc Operation " }});
      check(resp, crocs.registerChecks()) || fail(`Unable to create croc ${resp.status} ${resp.body}`);

  

     
      

     check(crocs.list(), crocs.listChecks()) || fail("could not get crocs")
     
    
     
     if(__ITER === 1) {

      newCrocID = resp.json('id')

      resp = crocs.rename(newCrocID, "New name", {tags: {name: 'Update Croc Operation'}})
      check(resp, crocs.renameChecks("New name")) || fail(`Unable to update the croc ${resp.status} ${resp.body}`);

      check(
        crocs.deregister(newCrocID, {tags: {name: 'Delete Croc Operation'}}), crocs.deregisterChecks()
      );

     }
     

      
  });

  group("Log me out!", () => {
      check(auth.cookieLogout(), auth.cookieLogoutChecks())

      
 //     check(crocs.list(), {
 //       "got crocs": (r) => r.status === 401,
 //     }) || fail("ERROR: I'm still logged in!");

  });

 sleep(1)
}
