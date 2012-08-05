var ordrin = typeof ordrin === "undefined" ? {} : ordrin;

(function(){
  "use strict";

  function getXhr() { 
    if (window.XMLHttpRequest) {
      // Chrome, Firefox, IE7+, Opera, Safari
      return new XMLHttpRequest(); 
    } 
    // IE6
    try { 
      // The latest stable version. It has the best security, performance, 
      // reliability, and W3C conformance. Ships with Vista, and available 
      // with other OS's via downloads and updates. 
      return new ActiveXObject('MSXML2.XMLHTTP.6.0');
    } catch (e) { 
      try { 
        // The fallback.
        return new ActiveXObject('MSXML2.XMLHTTP.3.0');
      } catch (e) { 
        alert('This browser is not AJAX enabled.'); 
        return null;
      } 
    }
  }

  function stringifyPrimitive(value){
    switch(typeof value){
      case 'string' : return value;
      case 'boolean' : return value ? 'true' : 'false';
      case 'number' : return isFinite(value) ? value : '';
      default : return '';
    }
  }

  function escape(value){
    return encodeURIComponent(value).replace('%20', '+');
  }

  function stringify(obj){
    return Object.keys(obj).map(function(k) {
      if(Array.isArray(obj[k])){
        return obj[k].map(function(v){
          return escape(stringifyPrimitive(k))+'='+escape(stringifyPrimitive(v));
        });
      } else {
        return escape(stringifyPrimitive(k))+'='+escape(stringifyPrimitive(obj[k]));
      }
    }).join('&');
  }

  function formatExpirationMonth(expirationMonth){
    if (String(expirationMonth).length == 1){
      expirationMonth = "0" + String(expirationMonth);
    }
    return expirationMonth;
  }

  function parseDateTime(dateTime){
    var date, time;
    if(dateTime instanceof Date){
      date = String(dateTime.getMonth() + 1) + "-" +  String(dateTime.getDate());
      time = dateTime.getHours() + ":" + dateTime.getMinutes();
    } else {
      if(typeof dateTime !== "string" && ! dateTime instanceof String){
        return {error:true};
      }
      var match = dateTime.match(/(\d{2}-\d{2})\+(\d{2}:\d{2})/);
      if(match){
        date = match[1];
        time = match[2];
      } else if(dateTime.toUpperCase() === "ASAP") {
        date = "ASAP";
        time = "";
      } else {
        return {error:true};
      }
      return {date:date, time:time, error:false};
    }
  }

  var Tools = function(){

    /*
     * Base function to make a request to the ordr.in api
     * host is the base uri, somehting like r-test.ordr.in
     * uri is a full uri string, so everthing after ordr.in
     * method is either GET or POST
     * data is any additional data to be included in the request body or query string
     * headers are additional headers beyond the X-NAAMA-Authentication
     */
    this.makeApiRequest = function(host, uri, method, data, callback){
      data = stringify(data);

      var req = getXhr();
      req.open(method, host+uri, false);

      if (method != "GET"){
        req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
      }

      req.send(data);

      if(req.status !== 200){
        callback({error: req.status, msg: req.statusText}, null);
        return;
      }

      callback(null, JSON.parse(req.response));
    }

    this.buildUriString = function(baseUri, params){
      for (var i = 0; i < params.length; i++){
        baseUri += "/" + encodeURIComponent(params[i]);
      }
      return baseUri;
    }
  };

  var Restaurant = function(restaurantUrl){
    var tools    = new Tools();


    this.getDeliveryList = function(dateTime, address, callback){
      dateTime = this.parseDateTime(dateTime);

      if(dateTime === null){
        callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
      }

      var params = [
        dateTime,
        address.zip,
        address.city,
        address.addr
      ];

      this.makeRestaurantRequest("/dl", params, {}, "GET", callback);
    }

    this.getDeliveryCheck = function(restaurantId, dateTime, address, callback){
      dateTime = this.parseDateTime(dateTime);

      if(dateTime === null){
        callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
      }

      var params = [
        restaurantId,
        dateTime,
        address.zip,
        address.city,
        address.addr
      ]

      this.makeRestaurantRequest("/dc", params, {}, "GET", callback);
    }

    this.getFee = function(restaurantId, subtotal, tip, dateTime, address, callback){
      dateTime = this.parseDateTime(dateTime);

      if(dateTime === null){
        callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
      }

      var params = [
        restaurantId,
        subtotal,
        tip,
        dateTime,
        address.zip,
        address.city,
        address.addr
      ]

      this.makeRestaurantRequest("/fee", params, {}, "GET", callback);
    }

    this.getDetails = function(restaurantId, callback){
      this.makeRestaurantRequest("/rd", [restaurantId], {}, "GET", callback);
    }

    /*
     * function to make all restaurant api requests
     * uri is the base uri so something like /dl, include the /
     * params are all parameters that go in the url. Note that this is different than the data
     * data is the data that goes either after the ? in a get request, or in the post body
     * method is either GET or POST (case-sensitive)
     */

    this.makeRestaurantRequest = function(uri, params, data, method, callback){
      var uriString = tools.buildUriString(uri, params);
      
      tools.makeApiRequest(restaurantUrl, uriString, method, data, callback);
    }

    this.parseDateTime = function(dateTime, callback){
      var delivery = parseDateTime(dateTime);
      if(delivery.error){
        return null;
      } else {
        if(delivery.date === "ASAP"){
          return "ASAP";
        } else {
          return delivery.date+'+'+delivery.time;
        }
      }
    }
  };

  // one validation error for a specific field. Used in ValidationError class
  var FieldError = function(field, msg){
    this.field = field;
    this.msg   = msg;
  }

  // extends the Error object, and is thrown whenever an Object fails validation. Can contain multiple field errors.
  var ValidationError = function(name, msg, errors){
    Error.apply(this, arguments);
    this.fields = {};

    // takes an array of FieldErrors and adds them to the field object
    this.addFields = function(fieldErrors){
      for (var i = 0; i < fieldErrors.length; i++){
        this.fields[fieldErrors[i].field] = fieldErrors[i].msg;
      }
    }
  }

  var Order = function(orderUrl){
    var tools    = new Tools();

    this.placeOrder = function(restaurantId, tray, tip, deliveryTime, firstName, lastName, address, creditCard, email, callback){
      var params = [
        restaurantId
      ];

      var delivery = parseDateTime(deliveryTime);
      if(delivery.error){
        callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
        return;
      }

      var data = {
        tray: tray.buildTrayString(),
        tip: tip,
        delivery_date: delivery.date,
        delivery_time: delivery.time,
        first_name: firstName,
        last_name: lastName,
        addr: address.addr,
        city: address.city,
        state: address.state,
        zip: address.zip,
        phone: address.phone,
        card_name: creditCard.name,
        card_number: creditCard.number,
        card_cvc: creditCard.cvc,
        card_expiry: creditCard.formatExpirationDate(),
        card_bill_addr: creditCard.billAddress.addr,
        card_bill_addr2: creditCard.billAddress.addr2,
        card_bill_city: creditCard.billAddress.city,
        card_bill_state: creditCard.billAddress.state,
        card_bill_zip: creditCard.billAddress.zip,
        em: email,
        type: "res"
      };

      var uriString = tools.buildUriString("/o", params);
      tools.makeApiRequest(orderUrl, uriString, "POST",  data, callback);
    }
  }

  var Address = function (addr, city, state, zip, phone, addr2){
    this.addr  = addr;
    this.city  = city;
    this.state = state;
    this.zip   = zip;
    this.phone = String(phone).replace(/[^\d]/g, ''); // remove all non-number, and stringify
    this.addr2 = addr2;


    this.validate = function(){
      var fieldErrors = [];
      // validate state
      if (/^[A-Z]{2}$/.test(this.state) == false){
        fieldErrors.push(new FieldError("state", "Invalid State format. It should be two upper case letters."));
      }
      // validate zip
      if (/^\d{5}$/.test(this.zip) == false){
        fieldErrors.push(new FieldError("zip", "Invalid Zip code. Should be 5 numbers"));
      }
      // validate phone number
      this.formatPhoneNumber();
      if (this.phone.length != 12){
        fieldErrors.push(new FieldError("phone", "Invalid Phone number. Should be 10 digits"));
      }
      if (fieldErrors.length != 0){
        var error = new ValidationError("Validation Error", "Check field errors for more details");
        error.addFields(fieldErrors);
        throw error;
      }
    }

    this.formatPhoneNumber = function(){
      this.phone = this.phone.substring(0, 3) + "-" + this.phone.substring(3, 6) + "-" + this.phone.substring(6);
    }
    this.validate();
  }

  var CreditCard = function(name, expiryMonth, expiryYear, billAddress, number, cvc){
    this.name        = name;
    this.expiryMonth = formatExpirationMonth(expiryMonth);
    this.expiryYear  = expiryYear;
    this.billAddress = billAddress;
    this.number      = String(number);
    this.cvc         = cvc;

    this.validate = function(){
      var fieldErrors = [];
      // validate card number
      if (!this.checkLuhn()){
        fieldErrors.push(new FieldError("number", "Invalid Credit Card Number"));
      }
      // determine the type of card for cvc check
      this.type        = this.creditCardType();
      // validate cvc
      var cvcExpression = /^\d{3}$/;
      if (this.type == "amex"){
        cvcExpression = /^\d{4}$/;
      }
      if (cvcExpression.test(this.cvc) == false){
        fieldErrors.push(new FieldError("cvc", "Invalid cvc"));
      }

      // // validate address
      // if (!(this.billAddress instanceof Address)){
      //   fieldErrors.push(new FieldError("address", "Address must be an instance of the Address class"));
      // }

      // validate expiration year
      if (/^\d{4}$/.test(this.expiryYear) == false){
        fieldErrors.push(new FieldError("expiryYear", "Expiration Year must be 4 digits"));
      }

      // validate expiration month
      if (/^\d{2}$/.test(this.expiryMonth) == false){
        fieldErrors.push(new FieldError("expiryMonth", "Expiration Month must be 2 digits"));
      }

      if (this.name.length == 0){
        fieldErrors.push(new FieldError("name", "Name can not be blank"));
      }

      if (fieldErrors.length != 0){
        var error = new ValidationError("Validation Error", "Check fields object for more details");
        error.addFields(fieldErrors);
        throw error;
      }
    }

    // credit card validation checksum. From http://typicalprogrammer.com/?p=4
    this.checkLuhn = function(){
      // digits 0-9 doubled with nines cast out
      var doubled = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];

      // remove non-digit characters
      this.number = this.number.replace(/[^\d]/g, '');
      var digits = this.number.split('');

      // alternate between summing the digits
      // or the result of doubling the digits and
      // casting out nines (see Luhn description)
      var alt = false;
      var total = 0;
      while (digits.length)
      {
        var d = Number(digits.pop());
        total += (alt ? doubled[d] : d);
        alt = !alt;
      }
      return total % 10 == 0;
    }

    // credit card tpype check. From http://typicalprogrammer.com/?p=4
    this.creditCardType = function(){
      // regular expressions to match common card types
      // delete or comment out cards not athis.numberepted
      // see: www.merriampark.com/anatomythis.number.htm
      var cardpatterns = {
        'visa'       : /^(4\d{12})|(4\d{15})$/,
        'mastercard' : /^5[1-5]\d{14}$/,
        'discover'   : /^6011\d{12}$/,
        'amex'       : /^3[47]\d{13}$/,
        'diners'     : /^(30[0-5]\d{11})|(3[68]\d{12})$/
      };

      // return type of credit card
      // or 'unknown' if no match

      for (var type in cardpatterns){
        if (cardpatterns[type].test(this.number))
          return type;
      }
      return 'unknown';
    }

    this.formatExpirationDate = function(){
      return this.expiryMonth + "/" + this.expiryYear;
    }

    this.validate();
  }

  var TrayItem = function(itemId, quantity, options){
    this.itemId   = itemId;
    this.quantity = quantity;
    this.options  = options;

    this.buildItemString = function(){
      var string = this.itemId + "/" + this.quantity;
      string += "," + this.options.join(',');
      return string;
    }
  }

  var Tray = function(items){
    this.items = items;

    this.buildTrayString = function(){
      var string = "";
      for (var i = 0; i < this.items.length; i++){
        string += "+" + this.items[i].buildItemString();
      }
      return string.substring(1); // remove that first plus
    };
  };

  var init = function(){
    return {
      restaurant: new Restaurant(ordrin.restaurantUrl),
      order: new Order(ordrin.orderUrl),
      Address: Address,
      CreditCard: CreditCard,
      TrayItem: TrayItem,
      Tray: Tray
    };
  };

  ordrin.api = init();
  
}());
var  ordrin = (ordrin instanceof Object) ? ordrin : {};

(function(){
  if(!ordrin.hasOwnProperty("template")){
    ordrin.menuTemplate = "<ul class=\"menuList\">{{#menu}}<li class=\"menuCategory\" data-mgid=\"{{id}}\"><div class=\"menu-hd\"><p class=\"header itemListName\">{{name}}</p></div><ul class=\"itemList menu main-menu\">{{#children}}<li class=\"mi\" data-listener=\"menuItem\" data-miid=\"{{id}}\"><p class=\"name\">{{name}}</p><p><span class=\"price\">{{price}}</span></p></li>{{/children}}</ul></li>{{/menu}}</ul><div class=\"trayContainer\"><div class=\"yourTray\">Your Tray</div><div class=\"addressContainer\"><b>Delivery Address:</b><div class=\"address\">{{#address}}{{addr}}<br>{{#addr2}}{{this}}<br>{{/addr2}}{{city}}, {{state}} {{zip}}<br>{{phone}}<br><div class=\"link\" data-listener=\"editAddress\">Edit</div>{{/address}}{{^address}}<div class=\"link\" data-listener=\"editAddress\">Please enter your address</div>{{/address}}</div><div class=\"addressForm hidden\"><form name=\"ordrinAddress\"><label>Street Address 1: <input type=\"text\" name=\"addr\" placeholder=\"Street Address 1\"></label><span class=\"addrError\"></span></br><label>Street Address 2: <input type=\"text\" name=\"addr2\" placeholder=\"Street Address 2\"></label><span class=\"addr2Error\"></span></br><label>City: <input type=\"text\" name=\"city\" placeholder=\"City\"></label><span class=\"cityError\"></span></br><label>State: <input type=\"text\" name=\"state\" placeholder=\"State\"></label><span class=\"stateError\"></span></br><label>Zip Code: <input type=\"text\" name=\"zip\" placeholder=\"Zip Code\"></label><span class=\"zipError\"></span></br><label>Phone Number: <input type=\"tel\" name=\"phone\" placeholder=\"Phone Number\"></label><span class=\"phoneError\"></span></br><input type=\"button\" class=\"buttonRed\" value=\"Update\" data-listener=\"updateAddress\"></form></div></div><div class=\"dateTimeContainer\"><b>Delivery Date/Time:</b><div class=\"dateTime\">{{deliveryTime}}</div><div class=\"link\" data-listener=\"editDeliveryTime\">Edit</div><div class=\"dateTimeForm hidden\"><form name=\"ordrinDateTime\"><label>Date<select name=\"date\" onchange=\"ordrin.mustard.dateSelected()\"><option value=\"ASAP\" selected=\"selected\">ASAP</option></select></label><div class=\"timeForm hidden\"><label>Time<select name=\"time\"><option value=\"12:00\" selected=\"selected\">12:00</option><option value=\"12:15\">12:15</option><option value=\"12:30\">12:30</option><option value=\"12:45\">12:45</option><option value=\"01:00\">01:00</option> <option value=\"01:15\">01:15</option> <option value=\"01:30\">01:30</option><option value=\"01:45\">01:45</option><option value=\"02:00\">02:00</option><option value=\"02:15\">02:15</option><option value=\"02:30\">02:30</option><option value=\"02:45\">02:45</option><option value=\"03:00\">03:00</option><option value=\"03:15\">03:15</option><option value=\"03:30\">03:30</option><option value=\"03:45\">03:45</option><option value=\"04:00\">04:00</option><option value=\"04:15\">04:15</option><option value=\"04:30\">04:30</option><option value=\"04:45\">04:45</option><option value=\"05:00\">05:00</option><option value=\"05:15\">05:15</option><option value=\"05:30\">05:30</option><option value=\"05:45\">05:45</option><option value=\"06:00\">06:00</option><option value=\"06:15\">06:15</option><option value=\"06:30\">06:30</option><option value=\"06:45\">06:45</option><option value=\"07:00\">07:00</option><option value=\"07:15\">07:15</option><option value=\"07:30\">07:30</option><option value=\"07:45\">07:45</option><option value=\"08:00\">08:00</option><option value=\"08:15\">08:15</option><option value=\"08:30\">08:30</option><option value=\"08:45\">08:45</option><option value=\"09:00\">09:00</option><option value=\"09:15\">09:15</option><option value=\"09:30\">09:30</option><option value=\"10:00\">10:00</option><option value=\"10:15\">10:15</option><option value=\"10:30\">10:30</option><option value=\"10:45\">10:45</option><option value=\"11:00\">11:00</option><option value=\"11:15\">11:15</option><option value=\"11:30\">11:30</option><option value=\"11:45\">11:45</option></select></label><select name=\"ampm\"><option value=\"PM\" selected>PM</option><option value=\"AM\">AM</option></select></div><input type=\"button\" class=\"smButtonRed\" value=\"Update\" data-listener=\"updateDateTime\"></form></div></div><ul class=\"tray\"></ul><div class=\"subtotal\">Subtotal: <span class=\"subtotalValue\">0.00</span></div><div class=\"tip\">Tip: <span class=\"tipValue\">0.00</span><input type=\"number\" min=\"0.00\" step=\"0.01\" value=\"0.00\" class=\"tipInput\"><input type=\"button\" value=\"Update\" data-listener=\"updateTray\"></div>{{^noProxy}}<div class=\"fee\">Fee: <span class=\"feeValue\">0.00</span></div><div class=\"tax\">Tax: <span class=\"taxValue\">0.00</span></div>{{/noProxy}}<div class=\"total\">Total: <span class=\"totalValue\">0.00</span></div></div><!-- Menu Item Dialog --><div class=\"optionsDialog popup-container hidden\"></div><div class=\"dialogBg fade-to-gray hidden\"></div><div class=\"errorDialog popup-container hidden\"><div class=\"dialog popup-box-container\"><div class=\"close-popup-box\"><img class=\"closeDialog\" data-listener=\"closeError\" src=\"https://fb.ordr.in/images/popup-close.png\" /></div><span class=\"errorMsg\"></span></div></div><div class=\"errorBg fade-to-gray hidden\"></div>";
  }

  if(!ordrin.hasOwnProperty("dialogTemplate")){
    ordrin.dialogTemplate = "<div class=\"popup-box-container dialog\"><div class=\"close-popup-box\"><img class=\"closeDialog\" data-listener=\"closeDialog\" src=\"https://fb.ordr.in/images/popup-close.png\" /></div><div class=\"mItem-add-to-tray popup-content\"><div class=\"menu-hd\"><div class=\"boxright\"><h1 class=\"big-col itemTitle\">{{name}}</h1><p class=\"slim-col itemPrice\">{{price}}</p></div><div class=\"clear\"></div></div><p class=\"desc dialogDescription\">{{descrip}}</p></div><div class=\"optionContainer\"><ul class=\"optionCategoryList\">{{#children}}<li data-mogid=\"{{id}}\" class=\"optionCategory\"><span class=\"header\">{{name}}</span><span class=\"error\"></span><ul class=\"optionList\">{{#children}}<li class=\"option\" data-moid=\"{{id}}\"><input type=\"checkbox\" class=\"optionCheckbox\" data-listener=\"optionCheckbox\" /><span class=\"optionName\">{{name}}</span><span class=\"optionPrice\">{{price}}</span></li>{{/children}}</ul><div class=\"clear\"></div></li>{{/children}}</ul>      </div><label for=\"itemQuantity\">Quantity: </label><input type=\"number\" class=\"itemQuantity\" value=\"1\" min=\"1\" /><br /><input type=\"submit\" class=\"buttonRed\" data-listener=\"addToTray\" value=\"Add to Tray\" /></div>";
  }

  if(!ordrin.hasOwnProperty("trayItemTemlate")){
    ordrin.trayItemTemplate = "<li class=\"trayItem\" data-listener=\"editTrayItem\" data-miid=\"{{itemId}}\" data-tray-id=\"{{trayItemId}}\"><div class=\"trayItemRemove\" data-listener=\"removeTrayItem\">X</div><span class=\"trayItemName\">{{itemName}}</span><span class=\"trayItemPrice\">{{quantityPrice}}</span><span class=\"trayItemQuantity\">({{quantity}})</span><ul>{{#options}}<li class=\"trayOption\"><span class=\"trayOptionName\">{{name}}</span><span class=\"trayOptionPrice\">{{totalPrice}}</span></li>{{/options}}</ul></li>";
  }

  if(!ordrin.hasOwnProperty("restaurantsTemplate")){
    ordrin.restaurantsTemplate = "<article class=\"restaurant-container\"><div><ul class=\"restaurants\">{{#restaurants}}<li><div class=\"rest-info big-col\"><section class=\"detail-col\"><a href=\"{{#params}}{{menu_uri}}{{/params}}/{{id}}{{#params}}?time={{dateTime}}&addr={{addr}}&city={{city}}&state={{state}}&zip={{zip}}&phone={{phone}}&addr2={{addr2}}{{/params}}\"><h1 class=\"restaurant\">{{na}}</h1></a><p class=\"address\">{{ad}}</p><p>Expected delivery time: {{del}} minutes</p><p>Minimum order amount: ${{mino}}</p><ul>{{#cu}}{{.}},{{/cu}}</ul><p>This restaurant will{{^is_delivering}} <b>not</b>{{/is_delivering}} deliver to this address at this time</p></section></div></li>{{/restaurants}}</ul></div></article>";
  }

  var Mustache="undefined"!==typeof module&&module.exports||{};
(function(j){function G(a){return(""+a).replace(/&(?!\w+;)|[<>"']/g,function(a){return H[a]||a})}function t(a,c,d,e){for(var e=e||"<template>",b=c.split("\n"),f=Math.max(d-3,0),g=Math.min(b.length,d+3),b=b.slice(f,g),i=0,l=b.length;i<l;++i)g=i+f+1,b[i]=(g===d?" >> ":"    ")+b[i];a.template=c;a.line=d;a.file=e;a.message=[e+":"+d,b.join("\n"),"",a.message].join("\n");return a}function u(a,c,d){if("."===a)return c[c.length-1];for(var a=a.split("."),e=a.length-1,b=a[e],f,g,i=c.length,l,j;i;){j=c.slice(0);
g=c[--i];for(l=0;l<e;){g=g[a[l++]];if(null==g)break;j.push(g)}if(g&&"object"===typeof g&&b in g){f=g[b];break}}"function"===typeof f&&(f=f.call(j[j.length-1]));return null==f?d:f}function I(a,c,d,e){var b="",a=u(a,c);if(e){if(null==a||!1===a||q(a)&&0===a.length)b+=d()}else if(q(a))y(a,function(a){c.push(a);b+=d();c.pop()});else if("object"===typeof a)c.push(a),b+=d(),c.pop();else if("function"===typeof a)var f=c[c.length-1],b=b+(a.call(f,d(),function(a){return r(a,f)})||"");else a&&(b+=d());return b}
function z(a,c){for(var c=c||{},d=c.tags||j.tags,e=d[0],b=d[d.length-1],f=['var buffer = "";',"\nvar line = 1;","\ntry {",'\nbuffer += "'],g=[],i=!1,l=!1,r=function(){if(i&&!l&&!c.space)for(;g.length;)f.splice(g.pop(),1);else g=[];l=i=!1},n=[],v,p,q,w=function(a){d=o(a).split(/\s+/);p=d[0];q=d[d.length-1]},x=function(a){f.push('";',v,'\nvar partial = partials["'+o(a)+'"];',"\nif (partial) {","\n  buffer += render(partial,stack[stack.length - 1],partials);","\n}",'\nbuffer += "')},u=function(b,d){var e=
o(b);if(""===e)throw t(Error("Section name may not be empty"),a,s,c.file);n.push({name:e,inverted:d});f.push('";',v,'\nvar name = "'+e+'";',"\nvar callback = (function () {","\n  return function () {",'\n    var buffer = "";','\nbuffer += "')},y=function(a){u(a,!0)},z=function(b){var b=o(b),d=0!=n.length&&n[n.length-1].name;if(!d||b!=d)throw t(Error('Section named "'+b+'" was never opened'),a,s,c.file);b=n.pop();f.push('";',"\n    return buffer;","\n  };","\n})();");b.inverted?f.push("\nbuffer += renderSection(name,stack,callback,true);"):
f.push("\nbuffer += renderSection(name,stack,callback);");f.push('\nbuffer += "')},A=function(a){f.push('";',v,'\nbuffer += lookup("'+o(a)+'",stack,"");','\nbuffer += "')},B=function(a){f.push('";',v,'\nbuffer += escapeHTML(lookup("'+o(a)+'",stack,""));','\nbuffer += "')},s=1,m,k,h=0,C=a.length;h<C;++h)if(a.slice(h,h+e.length)===e){h+=e.length;m=a.substr(h,1);v="\nline = "+s+";";p=e;q=b;i=!0;switch(m){case "!":h++;k=null;break;case "=":h++;b="="+b;k=w;break;case ">":h++;k=x;break;case "#":h++;k=u;
break;case "^":h++;k=y;break;case "/":h++;k=z;break;case "{":b="}"+b;case "&":h++;l=!0;k=A;break;default:l=!0,k=B}m=a.indexOf(b,h);if(-1===m)throw t(Error('Tag "'+e+'" was not closed properly'),a,s,c.file);e=a.substring(h,m);k&&k(e);for(k=0;~(k=e.indexOf("\n",k));)s++,k++;h=m+b.length-1;e=p;b=q}else switch(m=a.substr(h,1),m){case '"':case "\\":l=!0;f.push("\\"+m);break;case "\r":break;case "\n":g.push(f.length);f.push("\\n");r();s++;break;default:D.test(m)?g.push(f.length):l=!0,f.push(m)}if(0!=n.length)throw t(Error('Section "'+
n[n.length-1].name+'" was not closed properly'),a,s,c.file);r();f.push('";',"\nreturn buffer;","\n} catch (e) { throw {error: e, line: line}; }");b=f.join("").replace(/buffer \+= "";\n/g,"");c.debug&&("undefined"!=typeof console&&console.log?console.log(b):"function"===typeof print&&print(b));return b}function A(a,c){var d=z(a,c),e=new Function("view,partials,stack,lookup,escapeHTML,renderSection,render",d);return function(b,d){var d=d||{},g=[b];try{return e(b,d,g,u,G,I,r)}catch(i){throw t(i.error,
a,i.line,c.file);}}}function B(a,c){c=c||{};return!1!==c.cache?(p[a]||(p[a]=A(a,c)),p[a]):A(a,c)}function r(a,c,d){return B(a)(c,d)}j.name="mustache.js";j.version="0.5.0-dev";j.tags=["{{","}}"];j.parse=z;j.compile=B;j.render=r;j.clearCache=function(){p={}};j.to_html=function(a,c,d,e){a=r(a,c,d);if("function"===typeof e)e(a);else return a};var J=Object.prototype.toString,C=Array.isArray,E=Array.prototype.forEach,F=String.prototype.trim,q;q=C?C:function(a){return"[object Array]"===J.call(a)};var y;
y=E?function(a,c,d){return E.call(a,c,d)}:function(a,c,d){for(var e=0,b=a.length;e<b;++e)c.call(d,a[e],e,a)};var D=/^\s*$/,o;if(F)o=function(a){return null==a?"":F.call(a)};else{var w,x;D.test("\u00a0")?(w=/^\s+/,x=/\s+$/):(w=/^[\s\xA0]+/,x=/[\s\xA0]+$/);o=function(a){return a==null?"":(""+a).replace(w,"").replace(x,"")}}var H={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},p={}})(Mustache);

  ordrin.Mustache = Mustache;
})();
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
