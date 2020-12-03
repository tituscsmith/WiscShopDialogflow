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
    products = serverResponse;
  }

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

  async function navigate(){
    await sendMessage(agent.query, true);

    //Check system is logged in
      if(!token){
        agent.add("Please login to access the shop's features.");
        await sendMessage("Please login to access the shop's features.", false);
        return;
     }
    page =  agent.parameters.page;
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
  async function purchaseItems(){
    await sendMessage(agent.query, true);

    if(!token){
      agent.add("Please login to access the shop's features.");
      await sendMessage("Please login to access the shop's features.", false);
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

  }

  async function getProduct(){
    await sendMessage(agent.query, true);

    if(!token){
      agent.add("Please login to access the shop's features.");
      await  sendMessage("Please login to access the shop's features.", false);
      return;
   }
   agent.add("Say \"navigate\", if you would like to go to the $productname page or \"details\" if you would just like details here.")
   await sendMessage("Say \"navigate\", if you would like to go to the $productname page or \"details\" if you would just like details here.", false);
  }

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
      agent.add("Please login to access the shop's features.");
      await sendMessage("Please login to access the shop's features.");
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

  //Required methods
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

  async function getCategories(){
  await sendMessage(agent.query, true);

  if(!token){  //Check system is logged in
    agent.add("Please login to access the shop's features.");
    await sendMessage("Please login to access the shop's features.", false)
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

    agent.add("Here are the categories that we have: " + data.categories);
    await sendMessage("Here are the categories that we have: " + data.categories, false)

  }
  async function filterByTags(){
    await sendMessage(agent.query, true);
    //POST to application tags
    for(let i = 0; i<agent.parameters.tagDescriptors.length; i++){

      let request = {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'x-access-token': token},    
      }
      await fetch(ENDPOINT_URL + '/application/tags/' + agent.parameters.tagDescriptors[i],request).catch(error => agent.add("Not a valid tag. Please try another one"));

      agent.add("Items filtered by given tags.")
      await sendMessage("Items filtered by given tags.", false)
    }
  
  }
  async function getCategoryTags(){
      await sendMessage(agent.query, true);
    //   console.log("GetCATEGORYTAGS CALLED")
    //   console.log(agent.parameters);
    // console.log(!agent.parameters.clothingcategory );
      if(!token){//Check system is logged in
        agent.add("Please login to access the shop's features.");
        await sendMessage("Please login to access the shop's features.", false);
        return;
     }
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
    agent.add("Here are the tags: " + data.tags + " for " + agent.parameters.clothingcategory);
    await sendMessage("Here are the tags: " + data.tags + " for " + agent.parameters.clothingcategory, false);

  }

  async function userProvidesProductMedium(){
    await sendMessage(agent.query, true);
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
      agent.add("Navigating to the page for " + productname);
      await sendMessage("Navigating to the page for " + productname, false);
    }
    else{
      
      agent.add("Would you like reviews for this product as well?")
      await sendMessage("Would you like reviews for this product as well?", false);

      agent.context.set({
        'name': 'detailsaboutproduct',
        'lifespan': 5,
      });
    }
  }
  async function userProvidesCartMedium(){
    console.log("userProvidesCartMedium");
    await sendMessage(agent.query, true);
    if(agent.query === 'navigate'){
      console.log("if");
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
      agent.add("Navigating to your cart");
      await sendMessage("Navigating to your cart", false);
    }
    else{
      console.log("else");
      
      await infoAboutCart();
    }
  }
  async function login(){
    await sendMessage(agent.query, true);
    await sendMessage("Okay, what is your username? State \"It is... <username>\"", false);
  }
  //LOGIN FUNCTIONS
  function gotUsername(){
    console.log("gotUsername Called");
    username = agent.parameters.username;
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
    
    //CLEAR ALL MESSAGEs
    let request = {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json',
                'x-access-token': token}    }
  
    const serverReturn = await fetch(ENDPOINT_URL + '/application/messages',request);
    console.log(serverReturn);

    //Get all products
    getAllProducts();
  }
  async function clearCart(){
    await sendMessage(agent.query, true);

    agent.add("Are you absolutely sure you want to clear all your items in your cart?");
    await sendMessage("Are you absolutely sure you want to clear all your items in your cart?", false);
  }
  async function clearCartNo(){
    await sendMessage(agent.query, true);
    agent.add("Okay, I will not clear the items out of cart.");
    await sendMessage("Okay, I will not clear the items out of cart.", false)
  }
  async function addProductToCart(){
    await sendMessage(agent.query, true);
    // if(!agent.parameters.clothingcategory){
      agent.add("Are you sure you would like to add " + agent.parameters.productname + " to your cart?");
      await sendMessage("Are you sure you would like to add " + agent.parameters.productname + " to your cart?", false);
      return;
    //  }
  }
  async function confirmAddProductToCart(){
    await sendMessage(agent.query, true);
    product = agent.context.get('confirmaddtocart').parameters.productname;
    agent.add("How many of " + product + " would you like to add to your cart?");
    await sendMessage("How many of " + product + " would you like to add to your cart?", false);
  }
  async function reviewCart(){
    await sendMessage(agent.query, true);
    agent.add("Say \"navigate\", if you would like to go to the cart page or \"details\" if you would just like details here.");
    await sendMessage("Say \"navigate\", if you would like to go to the cart page or \"details\" if you would just like details here.", false);
  
  }
  async function removeProductFromCart(){
    await sendMessage(agent.query, true);
    // if(!agent.parameters.clothingcategory){
      agent.add("Are you sure you would like to remove " + agent.parameters.productname + " from your cart?");
      await sendMessage("Are you sure you would like to remove " + agent.parameters.productname + " from your cart?", false);
      return;
    //  }
  }
  async function confirmRemoveProductFromCart(){
    
    await sendMessage(agent.query, true);

    product = agent.context.get('confirmremovefromcart').parameters.productname;
    // console.log(product);
    agent.add("How many of " + product + " would you like to remove from your cart?");
    await sendMessage("How many of " + product + " would you like to remove from your cart?", false);
  }

  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome)
  // intentMap.set('getProductByCategory', getProductByCategory)
  intentMap.set('getCategories', getCategories)
  intentMap.set('getCategoryTags', getCategoryTags)

  intentMap.set('UserProvidesUsername', gotUsername)
  intentMap.set('UserProvidesPassword', gotPassword)
  intentMap.set('navigate', navigate)
  intentMap.set('getProductReviews', getProductAndReviews)
  intentMap.set('getProduct', getProduct)
  intentMap.set('clearCart', clearCart);
  intentMap.set('reviewCart', reviewCart);

  intentMap.set('clearCartYes', clearCartYes);
  intentMap.set('clearCartNo', clearCartNo);
intentMap.set('Login', login);
  // intentMap.set('checkCart', infoAboutCart);
  intentMap.set('addProductToCart', addProductToCart)
    intentMap.set('removeProductFromCart', removeProductFromCart);

  intentMap.set('confirmAddProductToCart', confirmAddProductToCart)
  intentMap.set('confirmRemoveProductFromCart', confirmRemoveProductFromCart)


  intentMap.set('userProvidesAddProductQuantity', userProvidesAddProductQuantity)
  intentMap.set('userProvidesRemoveProductQuantity', userProvidesRemoveProductQuantity)
  intentMap.set('purchaseItems', purchaseItems)
  intentMap.set('userProvidesProductMedium', userProvidesProductMedium)
  intentMap.set('userProvidesCartMedium', userProvidesCartMedium)

  intentMap.set('filterByTag', filterByTags)






  // intentMap.set('Login', login)



  
  // You will need to declare this `Login` content in DialogFlow to make this work
  // intentMap.set('Login', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
