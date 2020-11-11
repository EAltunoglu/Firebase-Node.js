const isEmpty = (string) => {
  if(string.trim() === '') return true;
  return false;
};

const isEmail = (email) => {
var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
if(email.match(pattern)) return true;
return false;
};

exports.validateSignupData = (data) => {
    let errors = {};
    const newUser = data;
    if(isEmpty(newUser.email)){
      errors.email = 'Must not be emtpy';
    } else if(!isEmail(newUser.email)){
      errors.email = 'Must be a valid email address';
    }
  
    if(isEmpty(newUser.password)){
      errors.password = "Must not be empty";
    } else if(newUser.password !== newUser.confirmPassword){
      errors.confirmPassword = 'Passwords must match';
    }
    
    if(isEmpty(newUser.username)){
      errors.username = 'Must not be empty';
    }
    
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false 
    }
}

exports.validateLoginData = (data) => {
    let errors = {};

    if(isEmpty(data.email)){
      errors.email = 'Must not be emtpy';
    }
    if(isEmpty(data.password)){
      errors.password = 'Must not be emtpy';
    }
  
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false 
    }
}

exports.reduceUserDetails = (data) => {
  let userDetails = {};
  if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if(!isEmpty(data.website.trim())){
    if(data.website.trim().substring(0, 4) !== 'http'){
      userDetails.website = `http://${data.website.trim()}`;
    }
    else {
      userDetails.website = data.website;
    }
  }
  if(!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};