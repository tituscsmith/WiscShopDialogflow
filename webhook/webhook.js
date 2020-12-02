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
  // console.log(token);
  return token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })
  function welcome () {
    agent.add('Webhook works!')
    console.log("Welcome Called");
    // console.log(ENDPOINT_URL)
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
    // console.log(serverResponse);
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

  async function navigate(){
    console.log("navigate");
      //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        return;
     }
    agent.add('Going to ' + agent.parameters.clothingcategory + ' page.');
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

  }
  async function purchaseItems(){
    if(!token){
      agent.add("Please login to access the shop's features.");
      return;
   }
  agent.add('Going to ' + agent.parameters.clothingcategory + ' page.');
  console.log(token);
  let request = {
    method: 'PUT',
    headers: {'Content-Type': 'application/json',
              'x-access-token': token}, 
              'body': JSON.stringify({
                "back": false,
              "dialogflowUpdated": true,
              "page": "/titus/cart-confirmed"
              }),      
  }


  const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
  const serverResponse = await serverReturn.json()

  }

  function getProduct(){
    if(!token){
      agent.add("Please login to access the shop's features.");
      return;
   }
  }
  async function getProductAndReviews(){
    //Check system is logged in
    if(!token){
      agent.add("Please login to access the shop's features.");
      return;
   }
    // checkedLogin();
    console.log("getProductReviews Called " + agent.query);
    let productname = agent.context.get('userprovidesproduct').parameters.productname;
    let id = getIdByProductName(productname);

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
  }

  //Creates a string of reviews for a product
  function getReviewString(reviews){
    var reviewString = 'Here are some reviews: ';
    var arr = Object.values(reviews)[0];
    var counter = 0;
    var totalRating = 0;
    for (var key in arr) {
      counter++;
      if (arr.hasOwnProperty(key)) {  
        reviewString += arr[key].text;
        totalRating += arr[key].stars;
      }
   }
   if(counter===0){
     return "There are no applicable reviews."
   }

   reviewString= reviewString.concat(". The average rating is " + totalRating/counter);
   return reviewString;
  }

  async function userProvidesAddProductQuantity(){
    console.log("userProvidesAddProductQuantity called");

    let productname = agent.context.get('userprovidesproduct').parameters.productname;
    let id = getIdByProductName(productname);
    let quantity =  agent.context.get('userprovidesproduct').parameters.quantity;

    if(quantity < 1){
      agent.add("Invalid quantity");
      return;
    }
    for(let i = 0; i< quantity;  i++){
      let request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
      }
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application/products/' + id,request)
      const serverResponse = await serverReturn.json()
      console.log(serverResponse);
    }
   
    agent.add("Added " + quantity + " of " + productname + " to your cart.");
  }
  // async function removeProductFromCart(){
  //   console.log("removeProductFromCart called");
  //   let product = agent.parameters.product;
  //   id = await getIdByProductName(product);
  //   console.log(id);
  //   let request = {
  //     method: 'GET',
  //     headers: {'Content-Type': 'application/json',
  //               'x-access-token': token}, 
  //   }

  //   const serverReturn = await fetch(ENDPOINT_URL + '/application/products/' + id,request)

  //   agent.add("You have " + serverReturn.count + " of " + product + ". How many would you like to remove?");
  //   const serverResponse = await serverReturn.json()
  // }
  async function userProvidesRemoveProductQuantity(){

    let productname = agent.context.get('userprovidesproduct').parameters.productname;
    let id = getIdByProductName(productname);
    let quantity =  agent.context.get('userprovidesproduct').parameters.quantity;

    if(quantity < 1){
      agent.add("Invalid quantity");
      return;
    }
    var i;
    for(i=0; i< quantity;  i++){
      let request = {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
      }
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application/products/' + id,request)
      const serverResponse = await serverReturn.json()
      console.log(serverResponse);
    }
   
    agent.add("Deleted " + i + " of " + productname + " to your cart.");
  }

   async function infoAboutCart(){
    console.log("infoAboutCart called");
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}, 
    }

    var totalCost = 0;
    var numItems = 0;
    var types = [{"category": "tees", "quantity": 0}, {"category": "leggings", "quantity": 0},
    {"category": "bottoms", "quantity": 0},{"category": "sweatshirts", "quantity": 0}, {"category": "plushes", "quantity": 0}];
    const serverReturn = await fetch(ENDPOINT_URL + '/application/products/', request)
    const serverResponse = await serverReturn.json()
    // console.log(serverResponse);

    var arr = Object.values(serverResponse)[0];

    for (var key in arr) {
      console.log("looping");
      if (arr.hasOwnProperty(key)) {  
        totalCost+=(arr[key].price*arr[key].count);
        numItems+=arr[key].count;
        for(let i = 0; i<5; i++){
          if(types[i].category === arr[key].category){
            console.log("if")
            types[i].quantity+=arr[key].count;
          }
          else{
            console.log(types[i].category + ' ' + arr[key].category)
          }
        }
      }
   } 
   console.log(types[3].quantity);


    agent.add("Your cart has " + numItems + " items for a total of $" + totalCost + ". Additionally, " + parseCategoriesFromCartString(types));

  }

  function parseCategoriesFromCartString(types){
    let messageString = '';
    messageString+= 'You have ' + types[0].quantity + " tees, ";
    messageString+= '' + types[3].quantity+ " sweatshirts, ";
    messageString+= '' + types[2].quantity+ " bottoms, ";
    messageString+= '' + types[1].quantity + " leggings, ";
    messageString+= ' and ' + types[4].quantity + " plushes.";
    return messageString;
  }

  //Required methods
  async function getProductByCategory(){
      //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        return;
     }
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
  //Check system is logged in
  if(!token){
    agent.add("Please login to access the shop's features.");
    return;
 }
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
  async function filterByTags(){
    console.log("filterByTags called");

    console.log(agent.parameters.tagDescriptors);
    console.log(agent.parameters.tagDescriptors.length);

    //POST to application tags
    for(let i = 0; i<agent.parameters.tagDescriptors.length; i++){
      console.log("looping");

      let request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token},    
      }
    
      console.log(agent.parameters.tagDescriptors[i]);
      await fetch(ENDPOINT_URL + '/application/tags/' + agent.parameters.tagDescriptors[i],request).catch(error => agent.add("Not a valid tag. Please try another one"));

      agent.add("Items filtered by given tags.")
      // var  serverResponse = await serverReturn.json();
      // console.log(serverResponse);

    }
  
  }
  async function getCategoryTags(){
      //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        return;
     }
    console.log("getCategoryTags");
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/categories/'+agent.parameters.clothingcategory + '/tags/',request)
    const serverResponse = await serverReturn.json()
    data = serverResponse;
    console.log(data.tags);
    // fetch()
    agent.add("Here are the tags: " + data.tags + " for " + agent.parameters.clothingcategory);
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
      agent.add("Log in failed.")
    }
    else{
      agent.add("Log in success!");
    }

    getAllProducts();
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
  intentMap.set('getProduct', getProduct)
  intentMap.set('checkCart', infoAboutCart);

  intentMap.set('userProvidesAddProductQuantity', userProvidesAddProductQuantity)
  // intentMap.set('removeProductFromCart', removeProductFromCart);
  intentMap.set('userProvidesRemoveProductQuantity', userProvidesRemoveProductQuantity)
  intentMap.set('purchaseItems', purchaseItems)
  intentMap.set('filterByTag', filterByTags)






  // intentMap.set('Login', login)



  
  // You will need to declare this `Login` content in DialogFlow to make this work
  // intentMap.set('Login', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
