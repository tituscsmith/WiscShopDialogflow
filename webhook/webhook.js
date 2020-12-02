const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

var username = "";
var password = "";
let token = "";
var products = [];
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
  
  //getter functions for all products, called in when login occurs
  async function getAllProducts(){
    console.log("calling getAllproducts");
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/products',request)
    const serverResponse = await serverReturn.json()
    // data = serverResponse;
    console.log(serverResponse);
    products = serverResponse;
  }

  function getIdByProductName(name){
    console.log("getIdByProductName");
    var arr = Object.values(products)[0];
    for (var key in arr) {
      if (arr.hasOwnProperty(key)) {  
        if(arr[key].name === name){
          console.log(arr[key].id);
          return arr[key].id;
        }
      }
   } 
  }

  async function sendMessage(query, isUser){
    let request = {
      method: 'POST',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token,
              'body': {
                "date": new Date().toISOString(),
                "isUser":isUser,
                "text": query,
              }},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/application/messages',request)
    const serverResponse = await serverReturn.json()
    console.log(serverResponse);
  }
//   fetch('https://mysqlcs639.cs.wisc.edu/activities/' + id, { method: 'PUT', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'x-access-token': this.props.token
// },
// body: JSON.stringify({
//   name: name,
//   duration: duration,
//   calories: calories,
//   date: date,

// })}).then(this.props.fetchTodayData()).catch(error => console.log(error));

// }
  async function navigate(){
    console.log("navigate");
    // let url = '/titus';
    // console.log(agent.parameters.clothingitem);
    // let page;
    // if(agent.parameters.clothingitem !== 'home'){
    //   page = agent.parameters.clothingitem;
    //   // console.log(ENDPOINT_URL.concat('/' + agent.parameters.clothingitem));
    //   // ENDPOINT_URL = ENDPOINT_URL.concat('/' + agent.parameters.clothingitem);
    //   ENDPOINT_URL = ENDPOINT_URL.concat('/titus/hats');
    //   console.log(ENDPOINT_URL);
    // }
    agent.add('Going to ' + agent.parameters.clothingitem + ' page.');
    console.log(token);
    let request = {
      method: 'PUT',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}, 
                'body': JSON.stringify({
                  "back": false,
                "dialogflowUpdated": true,
                "page": "/titus/hats"

                }),      
    }
  

    const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
    const serverResponse = await serverReturn.json()
    console.log(serverReturn);
    console.log(serverResponse);
  }

  async function getProductAndReviews(){
    console.log("getProductReviews Called " + agent.query);
    // console.log(agent.context.get('userprovidesproduct').parameters.productname);
    let productname = agent.context.get('userprovidesproduct').parameters.productname;
    let id = getIdByProductName(productname);
    // console.log(id);

    //Product Detail API Call
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    var serverReturn = await fetch(ENDPOINT_URL + '/products/' + id,request)
    var serverResponse = await serverReturn.json()
    details = serverResponse;

    var reviews = '';
    //Review API Call
    request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    serverReturn = await fetch(ENDPOINT_URL + '/products/' + id + '/reviews',request)
    serverResponse = await serverReturn.json()
    reviews = serverResponse;

    //If user wants reviews
    if(agent.query === 'yes'){
      console.log("yes");
      agent.add(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ". " + getReviewString(reviews));

    }//user just wants product reviews
    else{
      console.log("else");
      agent.add(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ".");
    }
    console.log(details);
    console.log(reviews);

   
    //Get id of product and then get details and reviews of that product
  }

  //Parses a review string
  function getReviewString(reviews){
    var reviewString = 'Here are some reviews: ';
    var arr = Object.values(reviews)[0];
    var counter = 0;
    for (var key in arr) {
      counter++;
      if (arr.hasOwnProperty(key)) {  
        reviewString += arr[key].text;
      }
   }
   if(counter===0){
     return "There are no applicable reviews."
   }

   return reviewString;
  }


  //Required methods
  async function getProductByCategory(){
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
    agent.add("Here are the tags: " + data.tags + " for " + agent.parameters.clothingitem);
  }


  //LOGIN FUNCTIONS
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

    getAllProducts();
    // agent.add(token);
  }





  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('getProductByCategory', getProductByCategory)
  intentMap.set('getCategories', getCategories)
  intentMap.set('getCategoryTags', getCategoryTags)

  intentMap.set('UserProvidesUsername', gotUsername)
  intentMap.set('UserProvidesPassword', gotPassword)
  intentMap.set('Navigate', navigate)
  intentMap.set('getProductReviews', getProductAndReviews)


  // intentMap.set('Login', login)



  
  // You will need to declare this `Login` content in DialogFlow to make this work
  // intentMap.set('Login', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
