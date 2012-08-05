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
