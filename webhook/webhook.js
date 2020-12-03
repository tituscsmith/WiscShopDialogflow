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
    agent.add('Hello! Web hook is connected.')
    console.log(ENDPOINT_URL)
  }
  
  //Getter functions for all products, called when login occurs
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
    products = serverResponse;
  }
//Not an intent handler, function used by other handlers
  function getIdByProductName(name){
    var arr = Object.values(products)[0];
    for (var key in arr) {
      if (arr.hasOwnProperty(key)) {  
        if(arr[key].name === name){
          return arr[key].id;
        }
      }
   } 
  }

  async function sendMessage(query, isUser){
    let request = {
      method: 'POST',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},

              'body': JSON.stringify({
                "isUser":isUser,
                "text": query
              }),      
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/application/messages',request)
    const serverResponse = await serverReturn.json()
  }

  async function purchaseItems(){
    await sendMessage(agent.query, true);

   //Confirm user is logged in
   if(!token){
    agent.add("Hello, please login to access the shop's features.");
    await sendMessage("Hello, please login to access the shop's features.", false)
    return;
 }

  agent.add('Here is your order for today.');
  await sendMessage('Here is your order for today.', false);
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

  }//Not required for assignment
  // async function getProductByCategory(){
  //     //Check system is logged in
  //     if(!token){
  //       agent.add("Please login to access the shop's features.");
  //       return;
  //    }
  //   let request = {
  //     method: 'GET',
  //     headers: {'Content-Type': 'application/json',
  //               'x-access-token': token},
  //     redirect: 'follow'
  //   }
  
  //   const serverReturn = await fetch(ENDPOINT_URL + '/products',request)
  //   const serverResponse = await serverReturn.json()
  //   data = serverResponse;
  // }
  async function navigate(){
    await sendMessage(agent.query, true);

      //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        await sendMessage("Please login to access the shop's features.", false);
        return;
     }

    agent.add("Please confirm that you would like to go to " + agent.parameters.pages + " page.");
    await sendMessage("Please confirm that you would like to go to " + agent.parameters.pages + " page.", false);
  }
  async function rejectNavigate(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Okay, I won't navigate to that page. I can navigate to category, product, home, and cart pages. What page would you like to go to?");
    await sendMessage("Okay, I won't navigate to that page. I can navigate to category, product, home, and cart pages. What page would you like to go to?", false);
  }
   async function confirmNavigate(){
    await sendMessage(agent.query, true);
    // console.log( agent.context.get('userprovidesdestination'));
    //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        await sendMessage("Please login to access the shop's features.", false);
        return;
     }
      //Check system is logged in
      if(!agent.context.get('userprovidesdestination').parameters.pages){
        agent.add("Please specify what page you would like to go to.");
        await sendMessage("Please login to access the shop's features.", false);
        return;
     }
    page =  agent.context.get('userprovidesdestination').parameters.pages;
    agent.add('Going to ' + page+ ' page.');
    await sendMessage('Going to ' + page+ ' page.', false);

    //CASE: Go to home page
    if(page === 'home' ){
      let request = {
        method: 'PUT',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
                  'body': JSON.stringify({
                    "back": false,
                  "dialogflowUpdated": true,
                  "page": "/titus"
                  }),      
      }
    
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
      const serverResponse = await serverReturn.json()
    }

    //CASE: Not the home page
    else{
      let request = {
        method: 'PUT',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
                  'body': JSON.stringify({
                    "back": false,
                  "dialogflowUpdated": true,
                  "page": "/titus/" + page
                  }),      
      }
    
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
      const serverResponse = await serverReturn.json()
    }
  }
  async function getProduct(){
    await sendMessage(agent.query, true);

    if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }
   if(!agent.parameters.productname){
    agent.add("Please provide a product name to add.");
    await sendMessage("Please provide a product name to add.", false)
    return;
  }

   agent.add("Say \"navigate\", if you would like to go to the " +  agent.parameters.productname + " page or \"details\" if you would just like details here.")
   await sendMessage("Say \"navigate\", if you would like to go to the" +  agent.parameters.productname + " page or \"details\" if you would just like details here.", false);
  }

  //Not an intent handler, used by other functions to get category for a given id
  async function getCategoryByProductId(id){

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
    return details.category;
  }
  async function getProductAndReviews(){
    await sendMessage(agent.query, true);

    //Check system is logged in
    if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }
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
      agent.add(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ". " + getReviewString(reviews));
      await sendMessage(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ". " + getReviewString(reviews), false)
    }//user just wants product reviews
    else{
      agent.add(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ".");
      await sendMessage(productname +" is described as \"" + details.description + "\" for a price of $" + details.price + ".", false);
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
    // console.log("USER PROVIDES CALLED");
    await sendMessage(agent.query, true);
    if(!agent.context.get('confirmaddtocart').parameters.quantity){
      agent.add("Please provide a quantity to add.");
      await sendMessage("Please provide a quantity to add.", false)
      return;
    }
    else{
      var quantity =  agent.context.get('confirmaddtocart').parameters.quantity;
    }
    let productname = agent.context.get('confirmaddtocart').parameters.productname;
    let id = await getIdByProductName(productname);
    // console.log(quantity + " " + productname);
    if(quantity < 1){
      agent.add("Invalid quantity");
      await sendMessage("Invalid quantity", false)
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
    }
   
    agent.add("Added " + quantity + " of " + productname + " to your cart.");
    await sendMessage("Added " + quantity + " of " + productname + " to your cart.", false)
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
    await sendMessage(agent.query, true);

    if(!agent.context.get('confirmremovefromcart').parameters.quantity){
      agent.add("Please provide a quantity to delete.");
      await sendMessage("Please provide a quantity to delete.", false)
      return;
    }
    else{
      var quantity =  agent.context.get('confirmremovefromcart').parameters.quantity;
    }
    let productname = agent.context.get('confirmremovefromcart').parameters.productname;
    let id = await getIdByProductName(productname);

    if(quantity < 1){
      agent.add("Invalid quantity");
      await sendMessage("Invalid quantity", false)
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
      // console.log(serverResponse);
    }
   
    agent.add("Deleted " + i + " of " + productname + " from your cart.");
    await sendMessage("Deleted " + i + " of " + productname + " from your cart.", false);

  }
  async function clearCartYes(){
    await sendMessage("Yes", true);
    //Confirm user is logged in
    if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }
    
    let request = {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}, 
    }

    const serverReturn = await fetch(ENDPOINT_URL + '/application/products/', request)
    const serverResponse = await serverReturn.json()

    agent.add("Cleared all items out of cart")
    await ssendMessage("Cleared all items out of cart", false);
  }
  //Not an intent handler, called by reviewCart
   async function infoAboutCart(){
    await sendMessage(agent.query, true);
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}, 
    }

    var totalCost = 0;
    var numItems = 0;
    var types = [{"category": "tees", "quantity": 0}, {"category": "leggings", "quantity": 0},
    {"category": "bottoms", "quantity": 0},{"category": "sweatshirts", "quantity": 0}, 
    {"category": "plushes", "quantity": 0}, {"category": "hats", "quantity": 0}];
    const serverReturn = await fetch(ENDPOINT_URL + '/application/products/', request)
    const serverResponse = await serverReturn.json()

    var arr = Object.values(serverResponse)[0];

    for (var key in arr) {
      if (arr.hasOwnProperty(key)) {  
        totalCost+=(arr[key].price*arr[key].count);
        numItems+=arr[key].count;
        for(let i = 0; i<5; i++){
          if(types[i].category === arr[key].category){
            types[i].quantity+=arr[key].count;
          }
        }
      }
   } 
  //  console.log(types[3].quantity);


    agent.add("Your cart has " + numItems + " items for a total of $" + totalCost + ". Additionally, " + parseCategoriesFromCartString(types));
   await sendMessage("Your cart has " + numItems + " items for a total of $" + totalCost + ". Additionally, " + parseCategoriesFromCartString(types), false);
  }

  //This function formats/creates a string to let user know 
  //how many of each category they have in their cart.
  function parseCategoriesFromCartString(types){
    let messageString = '';
    messageString+= 'You have ' + types[0].quantity + " tees, ";
    messageString+= '' + types[3].quantity+ " sweatshirts, ";
    messageString+= '' + types[2].quantity+ " bottoms, ";
    messageString+= '' + types[1].quantity + " leggings, ";
    messageString+= '' + types[5].quantity + " hats, ";
    messageString+= ' and ' + types[4].quantity + " plushes.";
    return messageString;
  }

  async function getCategories(){
  await sendMessage(agent.query, true);

  if(!token){  //Check system is logged in
    agent.add("Hello, please login to access the shop's features.");
    await sendMessage("Hello, please login to access the shop's features.", false)
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

    agent.add("Alright, here are the categories available today: " + data.categories);
    await sendMessage("Alright, Here are the categories available today: " + data.categories, false)

  }
  async function filterByTags(){
    await sendMessage(agent.query, true);
  
     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }
   if(agent.parameters.tagDescriptors.length<1){
    agent.add("Okay " + username + ", it looks like you didn't enter a tag or the tag is invalid, what valid tag would you like to filter by?");
    await sendMessage("Okay " + username + ", it looks like you didn't enter a tag or the tag is invalid, what valid tag would you like to filter by?", false);
    return;
   }

   agent.add("Please confirm that you would like to filter tags by " + agent.parameters.tagDescriptors);
   await sendMessage("Please confirm that you would like to filter tags by " + agent.parameters.tagDescriptors, false)

  }
  async function rejectFilterByTags(){
    await sendMessage(agent.query, true);
  
    //Confirm user is logged in
    if(!token){
     agent.add("Hello, please login to access the shop's features.");
     await sendMessage("Hello, please login to access the shop's features.", false)
     return;
    }
    
    agent.add("Okay, I won't filter by tags. What else can I do for you?");
    await sendMessage("Okay, I won't filter by tags. What else can I do for you?", false);

  }
  async function confirmFilterByTags(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }
   //Clear tags first
   let request = {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json',
              'x-access-token': token},    
  }
  await fetch(ENDPOINT_URL + '/application/tags/', request).catch(error => agent.add("Unable to clear tags"));

    //Now, POST to application tags
    for(let i = 0; i<agent.context.get('userprovidestag').parameters.tagDescriptors.length; i++){
      let request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token},    
      }
      await fetch(ENDPOINT_URL + '/application/tags/' + agent.context.get('userprovidestag').parameters.tagDescriptors[i],request).catch(error => tagErrorStatement());
    }

    agent.add("Okay, I am filtering items by given tags. If you don't see anything you'd like, try another tag.")
    await sendMessage("Okay, I am filtering items by given tags. If you don't see anything you'd like, try another tag.", false)
  
  }

  //Error statement for tag functions. Rarely gets called because of Dialogflow matching
  async function tagErrorStatement(){
    await sendMessage("Not a valid tag. Please try another one", false);
    agent.add("Not a valid tag. Please try another one")
  }
  async function getCategoryTags(){
      await sendMessage(agent.query, true);
      if(!token){//Check system is logged in
        agent.add("Hello, please login to access the shop's features.");
        await sendMessage("Hello, please login to access the shop's features.", false)
        return;
     }
     //Prompt for category if missing
     if(!agent.parameters.clothingcategory){
      agent.add("What category would you like tags for?");
      await sendMessage("What category would you like tags for?", false);
      return;
     }
    let request = {
      method: 'GET',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token},
      redirect: 'follow'
    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/categories/'+agent.parameters.clothingcategory + '/tags/',request)
    const serverResponse = await serverReturn.json()
    data = serverResponse;
    agent.add("Okay " + username + ", Here are the tags for " + agent.parameters.clothingcategory + ": " + data.tags);
    await sendMessage("Okay " + username + ", Here are the tags for " + agent.parameters.clothingcategory + ": " + data.tags, false);
  }

  async function userProvidesProductMedium(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    if(agent.query === 'navigate'){
      let productname = agent.context.get('userprovidesproduct').parameters.productname;
      let id = await getIdByProductName(productname);
      let category = await getCategoryByProductId(id);
      let request = {
        method: 'PUT',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
                  'body': JSON.stringify({
                    "back": false,
                  "dialogflowUpdated": true,
                  "page": "/titus/" + category + "/products/" + id
                  }),      
      }
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
      const serverResponse = await serverReturn.json()
      agent.add("Okay, navigating to the page for " + productname);
      await sendMessage("Okay, navigating to the page for " + productname, false);
    }
    else{//Ask for reviews
      
      agent.add("Alright, would you like reviews for this product as well?")
      await sendMessage("Alright, would you like reviews for this product as well?", false);

      agent.context.set({
        'name': 'detailsaboutproduct',
        'lifespan': 5,
      });
    }
  }
  async function userProvidesCartMedium(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    if(agent.query === 'navigate'){
      let request = {
        method: 'PUT',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token}, 
                  'body': JSON.stringify({
                    "back": false,
                  "dialogflowUpdated": true,
                  "page": "/titus/cart"
                  }),      
      }
  
      const serverReturn = await fetch(ENDPOINT_URL + '/application',request)
      const serverResponse = await serverReturn.json()
      agent.add("Okay " + username + ", I am navigating to your cart");
      await sendMessage("Okay " + username + ", I am navigating to your cart", false);
    }
    else{//Get details about cart      
      await infoAboutCart();
    }
  }

  //LOGIN FUNCTIONS --> Can't send messages because no token
  async function login(){
    // await sendMessage(agent.query, true);
    // await sendMessage("Okay, what is your username? State \"It is... <username>\"", false);
    agent.add("Okay, what is your username? State \"It is... <username>\"");
  }

  function gotUsername(){
    username = agent.parameters.username;
    agent.add("Okay, what is your password? State \"It is... <password>\"");

  }
  async function gotPassword(){
    password = agent.parameters.password;
    let token = await getToken();
    if(token === undefined){
      agent.add("Log in failed. Please check your username & password and try again.")
    }
    else{
      agent.add("Log in success. What can I do for you today?");
    }
    
    //Clear all messages in text box
    let request = {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/application/messages',request);
    // console.log(serverReturn);

    //Get all products
    getAllProducts();
  }

  async function clearCart(){
    await sendMessage(agent.query, true);

    //Confirm user is logged in
    if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Are you absolutely sure you want to clear all your items in your cart?");
    await sendMessage("Are you absolutely sure you want to clear all your items in your cart?", false);
  }
  async function clearCartNo(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Okay, I will not clear the items out of cart.");
    await sendMessage("Okay, I will not clear the items out of cart.", false)
  }
  async function addProductToCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

      agent.add("Are you sure you would like to add " + agent.parameters.productname + " to your cart?");
      await sendMessage("Are you sure you would like to add " + agent.parameters.productname + " to your cart?", false);
      return;
  }
  async function confirmAddProductToCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    product = agent.context.get('confirmaddtocart').parameters.productname;
    agent.add("How many of " + product + " would you like to add to your cart?");
    await sendMessage("How many of " + product + " would you like to add to your cart?", false);
  }
  async function reviewCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Say \"navigate\", if you would like to go to the cart page or \"details\" if you would just like details here.");
    await sendMessage("Say \"navigate\", if you would like to go to the cart page or \"details\" if you would just like details here.", false);
  
  }

  //Functions to confirm or remove from cart and provide quantity
  async function removeProductFromCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

      agent.add("Are you sure you would like to remove " + agent.parameters.productname + " from your cart?");
      await sendMessage("Are you sure you would like to remove " + agent.parameters.productname + " from your cart?", false);
      return;
  }
  async function rejectAddProductToCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Okay, I won't add that item. What else can I do for you?");
    await sendMessage("Okay, I won't add that item. What else can I do for you?", false);
  }
  async function confirmRemoveProductFromCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    product = agent.context.get('confirmremovefromcart').parameters.productname;
    agent.add("How many of " + product + " would you like to remove from your cart?");
    await sendMessage("How many of " + product + " would you like to remove from your cart?", false);
  }
  async function rejectRemoveProductFromCart(){
    await sendMessage(agent.query, true);

     //Confirm user is logged in
     if(!token){
      agent.add("Hello, please login to access the shop's features.");
      await sendMessage("Hello, please login to access the shop's features.", false)
      return;
   }

    agent.add("Okay, I won't remove that item. What else can I do for you?");
    await sendMessage("Okay, I won't remove that item. What else can I do for you?", false);
  }
  //Map intent handlers
  let intentMap = new Map();

  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('getCategories', getCategories)
  intentMap.set('getCategoryTags', getCategoryTags)
  intentMap.set('UserProvidesUsername', gotUsername)
  intentMap.set('userProvidesPassword', gotPassword)
  intentMap.set('getProductReviews', getProductAndReviews)
  intentMap.set('getProduct', getProduct)
  intentMap.set('clearCart', clearCart);
  intentMap.set('reviewCart', reviewCart);
  intentMap.set('clearCartYes', clearCartYes);
  intentMap.set('clearCartNo', clearCartNo);
intentMap.set('Login', login);
intentMap.set('navigate', navigate);
intentMap.set('confirmNavigate', confirmNavigate);
intentMap.set('rejectNavigate', rejectNavigate);


  intentMap.set('addProductToCart', addProductToCart)
    intentMap.set('removeProductFromCart', removeProductFromCart);
    intentMap.set('rejectAddProductToCart', rejectAddProductToCart);
    intentMap.set('rejectRemoveProductFromCart', rejectRemoveProductFromCart);
  intentMap.set('confirmAddProductToCart', confirmAddProductToCart)
  intentMap.set('confirmRemoveProductFromCart', confirmRemoveProductFromCart)
  intentMap.set('userProvidesAddProductQuantity', userProvidesAddProductQuantity)
  intentMap.set('userProvidesRemoveProductQuantity', userProvidesRemoveProductQuantity)
  intentMap.set('purchaseItems', purchaseItems)
  intentMap.set('userProvidesProductMedium', userProvidesProductMedium)
  intentMap.set('userProvidesCartMedium', userProvidesCartMedium)
  intentMap.set('rejectFilterByTag', rejectFilterByTags)
  intentMap.set('confirmFilterByTag', confirmFilterByTags)

  intentMap.set('filterByTag', filterByTags)

  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
