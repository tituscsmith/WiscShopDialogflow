const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

var username = "";
var password = "";
let token = "";

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT){
ENDPOINT_URL = "http://127.0.0.1:5000"
} else{
ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}



async function getToken () {
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json',
              'Authorization': 'Basic '+ base64.encode(username + ':' + password)},
    redirect: 'follow'
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/login',request)
  const serverResponse = await serverReturn.json()
  token = serverResponse.token
  console.log(token);
  return token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })
  function welcome () {
    agent.add('Webhook works!')
    console.log("Welcome Called");
    console.log(ENDPOINT_URL)
  }

  // async function login () {
    
  //   console.log("BLAH")
  //   console.log(username + " " + password)
  //   // You need to set this from `username` entity that you declare in DialogFlow
    
  //   // You need to set this from password entity that you declare in DialogFlow
  //   await getToken()
  //   console.log(token)

  //   // agent.add("LOGGED IN");
  // }

  function gotUsername(){
    console.log("gotUsername Called");

    username = agent.parameters.username;
    console.log(username)
  }
  async function gotPassword(){
    console.log("gotPassword Called");
    password = agent.parameters.password;
    let token = await getToken();
    if(token === undefined){
      agent.add("LOG IN FAILED")
    }
    else{
      agent.add("LOG IN SUCCESS");
    }
    // agent.add(token);
  }

  async function getProductByCategory(){

    // let item = agent.parameters.clothingitem;
    // var id = -1;
    // if(item === 'sweatshirt'){
    //   id = 2;
    // }
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/products',request)
    const serverResponse = await serverReturn.json()
    data = serverResponse;
    console.log(data);
  }
  async function getCategories(){

    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/categories',request)
    const serverResponse = await serverReturn.json()
    data = serverResponse;
    console.log(data);
    // fetch()
    agent.add("Here are the categories that we have: " + data.categories);
  }
  async function getCategoryTags(){
    console.log("getCategoryTags");
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/categories/'+agent.parameters.clothingitem + '/tags/',request)
    const serverResponse = await serverReturn.json()
    data = serverResponse;
    console.log(data.tags);
    // fetch()
    agent.add("Here are the tags: " + data.tags);
  }


  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('getProductByCategory', getProductByCategory)


  // intentMap.set('Login', login);
  intentMap.set('getCategories', getCategories)
  intentMap.set('getCategoryTags', getCategoryTags)

  intentMap.set('UserProvidesUsername', gotUsername)
  intentMap.set('UserProvidesPassword', gotPassword)


  
  // You will need to declare this `Login` content in DialogFlow to make this work
  // intentMap.set('Login', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
