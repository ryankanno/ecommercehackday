var  ordrin = (ordrin instanceof Object) ? ordrin : {};

(function(){
  "use strict";
  
  function Mustard(){
    this.dateSelected = function(){
      if(document.forms["ordrinDateTime"].date.value === "ASAP"){
        hideElement(getElementsByClassName(elements.menu, "timeForm")[0]);
      } else {
        unhideElement(getElementsByClassName(elements.menu, "timeForm")[0]);
      }
    }
    
    this.getTray = function(){
      return ordrin.tray;
    }

    var addressTemplate="{{addr}}<br>{{#addr2}}{{this}}<br>{{/addr2}}{{city}}, {{state}} {{zip}}<br>{{phone}}<br><a data-listener=\"editAddress\">Edit</a>";

    this.setAddress = function(address){
      ordrin.address = address;
      var addressHtml = ordrin.Mustache.render(addressTemplate, address);
      getElementsByClassName(elements.menu, "address")[0].innerHTML = addressHtml;
      this.deliveryCheck();
    }

    this.deliveryCheck = function(){
      if(!ordrin.noProxy){
        ordrin.api.restaurant.getDeliveryCheck(ordrin.rid, ordrin.deliveryTime, ordrin.address, function(err, data){
          if(err){
            handleError(err);
          } else {
            console.log(data);
            ordrin.delivery = data.delivery;
            if(data.delivery === 0){
              handleError(data);
            }
          }
        });
      } else {
        ordrin.delivery = true;
      }
    }
    
    this.getRid = function(){
      return ordrin.rid;
    }

    this.setRid = function(rid){
      ordrin.rid = rid;
    }

    this.getAddress = function(){
      return ordrin.address;
    }

    this.setDeliveryTime = function(dateTime){
      ordrin.deliveryTime = dateTime;
      getElementsByClassName(elements.menu, "dateTime")[0].innerHTML = dateTime;
    }

    this.getDeliveryTime = function(){
      return ordrin.deliveryTime;
    }

    this.getTip = function(){
      return ordrin.tip;
    }

    this.downloadMenu = function(rid){
      ordrin.api.restaurant.getDetails(rid, function(err, data){
        ordrin.menu = data.menu;
      });
      return ordrin.menu;
    }

    this.downloadRestaurants = function(dateTime, address){
      ordrin.api.restaurant.getDeliveryList(dateTime, address, function(err, data){
        ordrin.restaurants = data;
        for(var i=0; i<ordrin.restaurants.length; i++){
          ordrin.restaurants[i].is_delivering = !!(ordrin.restaurants[i].is_delivering);
        }
      });
    }
    
    this.renderMenu = function(){
      var menuHtml = ordrin.Mustache.render(ordrin.menuTemplate, ordrin);
      document.getElementById("ordrinMenu").innerHTML = menuHtml;
      getElements();
    }

    this.renderRestaurants = function(){
      var params = {};
      for(var prop in ordrin.address){
        if(ordrin.address.hasOwnProperty(prop)){
          params[prop] = encodeURIComponent(ordrin.address[prop] || '');
        }
      }
      params.dateTime = ordrin.deliveryTime;
      console.log(params);
      for(var i=0; i<ordrin.restaurants.length; i++){
        ordrin.restaurants[i].params = params;
      }
      var restaurantsHtml = ordrin.Mustache.render(ordrin.restaurantsTemplate, ordrin);
      document.getElementById("ordrinRestaurants").innerHTML = restaurantsHtml;
    }
  }

  ordrin.mustard = new Mustard();

  if(!ordrin.hasOwnProperty("render")){
	  ordrin.render = true;
  }

  var elements = {}; // variable to store elements so we don't have to continually DOM them

  //All prices should be in cents

  function toCents(value){
    if(value.indexOf('.') < 0){
      return (+value)*100;
    } else {
      var match = value.match(/(\d*)\.(\d{2})\d*$/);
      if(match){
        return +(match[1]+match[2]);
      } else {
        match = value.match(/(\d*)\.(\d)$/);
        if(match){
          return +(match[1]+match[2])*10;
        } else {
          console.log(value+" is not an amount of money");
        }
      }
    }
  }

  function toDollars(value){
    var cents = value.toString();
    while(cents.length<3){
      cents = '0'+cents;
    }
    var index = cents.length - 2;
    return cents.substring(0, index) + '.' + cents.substring(index);
  }
  
  var Option = function(id, name, price){
    this.id = id;
    this.name = name;
    this.price = toCents(price);
  }

  var nextId = 0;
  
  // ordrin api classes
  var TrayItem = function(itemId, quantity, options, itemName, price){
    this.trayItemId = nextId++;
    this.itemId   = itemId;
    this.itemName = itemName;
    this.quantity = +quantity;
    for(var i=0; i<options.length; i++){
      options[i].totalPrice = toDollars(options[i].price * this.quantity);
    }
    this.options  = options;
    this.price = toCents(price);
    this.quantityPrice = toDollars(this.quantity * this.price)

    this.buildItemString = function(){
      var string = this.itemId + "/" + this.quantity;

      for (var i = 0; i< this.options.length; i++){
        string += "," + this.options[i].id;
      }
      return string;
    }

    this.renderTrayHtml = function(){
      if(typeof this.trayItemNode === "undefined"){
        var html = ordrin.Mustache.render(ordrin.trayItemTemplate, this);
        var div = document.createElement("div");
        div.innerHTML = html;
        this.trayItemNode = div.firstChild;
      }
      return this.trayItemNode;
    }

    this.hasOptionSelected = function(id){
      for(var i=0; i<options.length; i++){
        if(options[i].id == id){
          return true;
        }
      }
      return false;
    }

    this.getTotalPrice = function(){
      var price = this.price;
      for(var i=0; i<this.options.length; i++){
        price += this.options[i].price;
      }
      return price*this.quantity;
    }
  }

  var Tray = function(){
    this.items = {};

    this.addItem = function(item){
      if (!(item instanceof TrayItem)){
        throw new Error("Item must be an object of the Tray Item class");
      } else {
        this.items[item.trayItemId] = item;
        var newNode = item.renderTrayHtml();
        var pageTrayItems = getElementsByClassName(elements.tray, "trayItem");
        for(var i=0; i<pageTrayItems.length; i++){
          if(+(pageTrayItems[i].getAttribute("data-tray-id"))===item.trayItemId){
            elements.tray.replaceChild(newNode, pageTrayItems[i]);
            updateFee();
            return;
          }
        }
        elements.tray.appendChild(newNode);
      }
      updateFee();
    }

    this.removeItem = function(id){
      var removed = this.items[id];
      delete this.items[id];
      elements.tray.removeChild(removed.trayItemNode);
      updateFee();
    }

    this.buildTrayString = function(){
      var string = "";
      for (var id in this.items){
        if(this.items.hasOwnProperty(id)){
          string += "+" + this.items[id].buildItemString();
        }
      }
      return string.substring(1); // remove that first plus
    }

    this.getSubtotal = function(){
      var subtotal = 0;
      for(var id in this.items){
        if(this.items.hasOwnProperty(id)){
          subtotal += this.items[id].getTotalPrice();
        }
      }
      return subtotal;
    }
  };

  function updateFee(){
    var subtotal = ordrin.tray.getSubtotal();
    getElementsByClassName(elements.menu, "subtotalValue")[0].innerHTML = toDollars(subtotal);
    var tip = toCents(getElementsByClassName(elements.menu, "tipInput")[0].value+"");
    ordrin.tip = tip;
    getElementsByClassName(elements.menu, "tipValue")[0].innerHTML = toDollars(tip);
    if(ordrin.noProxy){
      var total = subtotal + tip;
      getElementsByClassName(elements.menu, "totalValue")[0].innerHTML = toDollars(total);
    } else {
      ordrin.api.restaurant.getFee(ordrin.rid, toDollars(subtotal), toDollars(tip), ordrin.deliveryTime, ordrin.address, function(err, data){
        if(err){
          handleError(err);
        } else {
          getElementsByClassName(elements.menu, "feeValue")[0].innerHTML = data.fee;
          getElementsByClassName(elements.menu, "taxValue")[0].innerHTML = data.tax;
          var total = subtotal + tip + toCents(data.fee) + toCents(data.tax);
          getElementsByClassName(elements.menu, "totalValue")[0].innerHTML = toDollars(total);
          if(data.delivery === 0){
            handleError({delivery:0, msg:data.msg});
          }
        }
      });
    }
  }

  ordrin.tray = new Tray()
  ordrin.getTrayString = function(){
    return this.tray.buildTrayString();
  }

  function handleError(error){
    if(typeof ordrin.callback === "function"){
      ordrin.callback(error);
    } else {
      console.log(error);
      if(typeof error === "object" && typeof error.msg !== "undefined"){
        showErrorDialog(error.msg);
      } else {
        showErrorDialog(JSON.stringify(error));
      }
    }
  }

  function hideElement(element){
    element.className += " hidden";
  }

  function unhideElement(element){
    element.className = element.className.replace(/\s?\bhidden\b\s?/g, ' ').replace(/  /, ' ');
  }

  function toggleHideElement(element){
    if(/\bhidden\b/.test(element.className)){
      unhideElement(element);
    } else {
      hideElement(element);
    }
  }

  function showErrorDialog(msg){
    // show background
    elements.errorBg.className = elements.errorBg.className.replace("hidden", "");

    getElementsByClassName(elements.errorDialog, "errorMsg")[0].innerHTML = msg;
    // show the dialog
    elements.errorDialog.className = elements.errorDialog.className.replace("hidden", "");
  }

  function hideErrorDialog(){
    elements.errorBg.className   += " hidden";
    elements.errorDialog.className += " hidden";
    clearNode(getElementsByClassName(elements.errorDialog, "errorMsg")[0]);
  }
  
  function listen(evnt, elem, func) {
    if (elem.addEventListener)  // W3C DOM
      elem.addEventListener(evnt,func,false);
    else if (elem.attachEvent) { // IE DOM
      var r = elem.attachEvent("on"+evnt, func);
      return r;
    }
  }

  function goUntilParent(node, targetClass){
    var re = new RegExp("\\b"+targetClass+"\\b")
    if (node.className.match(re) === null){
      while(node.parentNode !== document){
        node = node.parentNode;
        if (node.className.match(re) === null){
          continue;
        }else{
          break;
        }
      }
      return node;
    } else {
      return node;
    }
  }

  function clearNode(node){
    while(node.firstChild){
      node.removeChild(node.firstChild);
    }
  }

  function extractAllItems(itemList){
    var items = {};
    var item;
    for(var i=0; i<itemList.length; i++){
      item = itemList[i];
      items[item.id] = item;
      if(typeof item.children !== "undefined"){
        var children = extractAllItems(item.children);
        for(var id in children){
          if(children.hasOwnProperty(id)){
            items[id] = children[id];
          }
        }
      }
      else{
        item.children = false;
      }
      if(typeof item.descrip === "undefined"){
        item.descrip = "";
      }
    }
    return items;
  }

  var allItems = {};

  function populateAddressForm(){
    if(typeof ordrin.address !== "undefined"){
      var form = document.forms["ordrinAddress"];
      form.addr.value = ordrin.address.addr || '';
      form.addr2.value = ordrin.address.addr2 || '';
      form.city.value = ordrin.address.city || '';
      form.state.value = ordrin.address.state || '';
      form.zip.value = ordrin.address.zip || '';
      form.phone.value = ordrin.address.phone || '';
    }
  }

  function padLeft(number, size, c){
    if(typeof c === "undefined"){
      c = "0";
    }
    var str = ''+number;
    var len = str.length
    for(var i=0; i<size-len; i++){
      str = c+str;
    }
    return str;
  }

  function initializeDateForm(){
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var form = document.forms["ordrinDateTime"];
    var date = new Date();
    var option = document.createElement("option");
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = "Today, "+days[date.getDay()];
    form.date.appendChild(option);
    
    option = document.createElement("option");
    date.setDate(date.getDate()+1);
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = "Tomorrow, "+days[date.getDay()];
    form.date.appendChild(option);
    
    option = document.createElement("option");
    date.setDate(date.getDate()+1);
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = months[date.getMonth()]+" "+date.getDate()+', '+days[date.getDay()];
    form.date.appendChild(option);
  }

  function init(){
    if(typeof ordrin.deliveryTime === "undefined"){
      ordrin.deliveryTime = "ASAP";
    }
    if(typeof ordrin.rid !== "undefined"){
      if(typeof ordrin.menu === "undefined" && !ordrin.noProxy){
        ordrin.mustard.downloadMenu(ordrin.rid);
      }
      allItems = extractAllItems(ordrin.menu);
      if(ordrin.render === "menu" || ordrin.render === "all"){
        ordrin.mustard.renderMenu();
      } else {
        getElements();
      }
      listen("click", document, clicked);
      populateAddressForm();
      if(ordrin.address){
        ordrin.mustard.deliveryCheck();
      } else {
        ordrin.delivery = true;
      }
      initializeDateForm();
    }
    if(ordrin.render === "restaurants" || ordrin.render === "all"){
      if(typeof ordrin.restaurants === "undefined" && !ordrin.noProxy){
        ordrin.mustard.downloadRestaurants(ordrin.deliveryTime, ordrin.address);
      }
      ordrin.mustard.renderRestaurants();
    }
  };

  function clicked(event){
    if (typeof event.srcElement == "undefined"){
      event.srcElement = event.target;
    }
    // call the appropiate function based on what element was actually clicked
    var routes = {  
      menuItem    : createDialogBox,
      editTrayItem : createEditDialogBox,
      closeDialog : hideDialogBox,
      addToTray : addTrayItem,
      removeTrayItem : removeTrayItem,
      optionCheckbox : validateCheckbox,
      updateTray : updateFee,
      updateAddress : saveAddressForm,
      editAddress : showAddressForm,
      updateDateTime : saveDateTimeForm,
      editDeliveryTime : showDateTimeForm,
      closeError : hideErrorDialog
    }
    var node = event.srcElement;
    while(!node.hasAttribute("data-listener")){
      if(node.tagName.toUpperCase() === "HTML"){
        return;
      }
      node = node.parentNode;
    }
    var name = node.getAttribute("data-listener");

    if (typeof routes[name] != "undefined"){
      routes[name](node);
    }
  }

  function showAddressForm(){
    toggleHideElement(getElementsByClassName(elements.menu, "addressForm")[0]);
  }

  function showDateTimeForm(){
    toggleHideElement(getElementsByClassName(elements.menu, "dateTimeForm")[0]);
    ordrin.mustard.dateSelected();
  }

  function saveDateTimeForm(){
    var form = document.forms["ordrinDateTime"];
    var date = form.date.value;
    if(date === "ASAP"){
      ordrin.mustard.setDeliveryTime("ASAP");
    } else {
      var split = form.time.value.split(":");
      var hours = split[0]="12"?0:+split[0];
      var minutes = +split[1];
      if(form.ampm.value = "PM"){
        hours += 12;
      }
      
      var time = padLeft(hours,2)+":"+padLeft(minutes,2);
      ordrin.mustard.setDeliveryTime(date+"+"+time);
    }
    hideElement(getElementsByClassName(elements.menu, "dateTimeForm")[0]);
  }

  function saveAddressForm(){
    var form = document.forms["ordrinAddress"];
    var inputs = ['addr', 'addr2', 'city', 'state', 'zip', 'phone'];
    for(var i=0; i<inputs.length; i++){
      getElementsByClassName(elements.menu, inputs[i]+"Error")[0].innerHTML = '';
    }
    try {
      var address = new ordrin.api.Address(form.addr.value, form.city.value, form.state.value, form.zip.value, form.phone.value, form.addr2.value);
      ordrin.mustard.setAddress(address);
      populateAddressForm();
      hideElement(getElementsByClassName(elements.menu, "addressForm")[0]);
    } catch(e){
      console.log(e.stack);
      if(typeof e.fields !== "undefined"){
        var keys = Object.keys(e.fields);
        for(var i=0; i<keys.length; i++){
          getElementsByClassName(elements.menu, keys[i]+"Error")[0].innerHTML = e.fields[keys[i]];
        }
      }
    }
  }

  function getChildWithClass(node, className){
    var re = new RegExp("\\b"+className+"\\b");
    for(var i=0; i<node.children.length; i++){
      if(re.test(node.children[i].className)){
        return node.children[i];
      }
    }
  }

  function getElementsByClassName(node, className){
    if(typeof node.getElementsByClassName !== "undefined"){
      return node.getElementsByClassName(className);
    }
    var re = new RegExp("\\b"+className+"\\b");
    var nodes = [];
    for(var i=0; i<node.children.length; i++){
      var child = node.children[i];
      if(re.test(child.className)){
        nodes.push(child);
      }
      nodes = nodes.concat(getElementsByClassName(child, className));
    }
    return nodes;
  }

  function createDialogBox(node){
    // get the correct node, if it's not the current one
    var itemId = node.getAttribute("data-miid");
    buildDialogBox(itemId);
    showDialogBox();
  }

  function createEditDialogBox(node){
    var itemId = node.getAttribute("data-miid");
    var trayItemId = node.getAttribute("data-tray-id");
    var trayItem = ordrin.tray.items[trayItemId];
    buildDialogBox(itemId);
    var options = getElementsByClassName(elements.dialog, "option");
    for(var i=0; i<options.length; i++){
      var optId = options[i].getAttribute("data-moid");
      var checkbox = getElementsByClassName(options[i], "optionCheckbox")[0];
      checkbox.checked = trayItem.hasOptionSelected(optId);
    }
    var button = getElementsByClassName(elements.dialog, "buttonRed")[0];
    button.setAttribute("value", "Save to Tray");
    var quantity = getElementsByClassName(elements.dialog, "itemQuantity")[0];
    quantity.setAttribute("value", trayItem.quantity);
    elements.dialog.setAttribute("data-tray-id", trayItemId);
    showDialogBox();
  }

  function buildDialogBox(id){
    elements.dialog.innerHTML = ordrin.Mustache.render(ordrin.dialogTemplate, allItems[id]);
    elements.dialog.setAttribute("data-miid", id);
  }
  
  function showDialogBox(){
    // show background
    elements.dialogBg.className = elements.dialogBg.className.replace("hidden", "");

    // show the dialog
    elements.dialog.className = elements.dialog.className.replace("hidden", "");
  }

  function hideDialogBox(){
    elements.dialogBg.className   += " hidden";
    clearNode(elements.dialog);
    elements.dialog.removeAttribute("data-tray-id");
  }

  function removeTrayItem(node){
    var item = goUntilParent(node, "trayItem");
    ordrin.tray.removeItem(item.getAttribute("data-tray-id"));
  }

  function validateCheckbox(node){
    var category = goUntilParent(node, "optionCategory");
    validateGroup(category);
  }

  function validateGroup(groupNode){
    var group = allItems[groupNode.getAttribute("data-mogid")];
    var min = +(group.min_child_select);
    var max = +(group.max_child_select);
    var checkBoxes = getElementsByClassName(groupNode, "optionCheckbox");
    var checked = 0;
    var errorNode = getChildWithClass(groupNode, "error");
    clearNode(errorNode);
    for(var j=0; j<checkBoxes.length; j++){
      if(checkBoxes[j].checked){
        checked++;
      }
    }
    if(checked<min){
      error = true;
      var errorText = "You must select at least "+min+" options";
      var error = document.createTextNode(errorText);
      errorNode.appendChild(error);
      return false;
    }
    if(max>0 && checked>max){
      error = true;
      var errorText = "You must select at most "+max+" options";
      var error = document.createTextNode(errorText);
      errorNode.appendChild(error);
      return false;
    }
    return true;
  }

  function createItemFromDialog(){
    var id = elements.dialog.getAttribute("data-miid");
    var quantity = getElementsByClassName(elements.dialog, "itemQuantity")[0].value;
    if(quantity<1){
      quantity = 1;
    }

    var error = false;
    var categories = getElementsByClassName(elements.dialog, "optionCategory");
    for(var i=0; i<categories.length; i++){
      if(!validateGroup(categories[i])){
        error = true;
      }
    }

    if(error){
      return;
    }
    var options = [];
    var checkBoxes = getElementsByClassName(elements.dialog, "optionCheckbox");
    for(var i=0; i<checkBoxes.length; i++){
      if(checkBoxes[i].checked){
        var listItem = goUntilParent(checkBoxes[i], "option")
        var optionId = listItem.getAttribute("data-moid");
        var optionName = allItems[optionId].name;
        var optionPrice = allItems[optionId].price;
        var option = new Option(optionId, optionName, optionPrice)
        options.push(option);
      }
    }
    var itemName = allItems[id].name;
    var itemPrice = allItems[id].price;
    var trayItem =  new TrayItem(id, quantity, options, itemName, itemPrice);
    if(elements.dialog.hasAttribute("data-tray-id")){
      trayItem.trayItemId = +(elements.dialog.getAttribute("data-tray-id"));
    }
    return trayItem;
  }

  function addTrayItem(){
    var trayItem = createItemFromDialog();
    ordrin.tray.addItem(trayItem);
    hideDialogBox();
    if(!ordrin.delivery){
      handleError({msg:"The restaurant will not deliver to this address at the chosen time"});
    }
  }

  // UTILITY FUNCTIONS
  function getElements(){
    var menu          = document.getElementById("ordrinMenu");
    elements.menu     = menu;
    elements.dialog   = getElementsByClassName(menu, "optionsDialog")[0];
    elements.dialogBg = getElementsByClassName(menu, "dialogBg")[0];
    elements.errorDialog = getElementsByClassName(menu, "errorDialog")[0];
    elements.errorBg = getElementsByClassName(menu, "errorBg")[0];
    elements.tray     = getElementsByClassName(menu, "tray")[0];
  }

  init();
})();
