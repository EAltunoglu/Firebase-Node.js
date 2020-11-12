const { admin, db } = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);
const {validateSignupData, validateLoginData, reduceUserDetails} = require('../util/validators');
const {uuid} = require("uuidv4");
//const {getUserFavs} = require('');

exports.signup =  (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      username: req.body.username
    };
    
    const { valid, errors } = validateSignupData(newUser);

    const noImg = 'no-img.png';
    
    if(!valid){
        return res.status(400).json(errors);
    }

    let tkn, userId;
    db.doc(`/users/${newUser.username}`)
      .get()
      .then(doc => {
        if(doc.exists){
          return res.status(400).json({username: 'this username is already taken'});
        } else {
          return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
      })
      .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
      })
      .then(token => {
        tkn = token;
        const userCredentials = {
          username: newUser.username,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
          userId
        };
        return db.doc(`/users/${newUser.username}`).set(userCredentials);
      })
      .then(() => {
        return res.status(201).json({token: tkn});
      })
      .catch(err => {
        console.error(err);
        if(err.code ==="auth/email-already-in-use")
          return res.status(400).json({email: 'Email is already in use'});
        return res.status(500).json({error: err.code, general: 'Something went wrong (signup). Try again'});
      });
      
}

exports.login = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password
    };
    //console.log(user);   
    const {valid, errors} = validateLoginData(user);

    if(!valid) return res.status(400).json(errors);
  
    firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then(token => {
        return res.json({token});
      })
      .catch((err) => {
        console.log(err);
        return res
        .status(403)
        .json({general: "Wrong credentials, please try again"});
      });
}

// Any user
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.username}`).get()
  .then(doc => {
    if(doc.exists){
      userData.user = doc.data();
      return db.collection('favs').where('username', '==', req.params.username)
        .orderBy('createdAt', 'desc')
        .get();
    } else {
      return res.status(404).json({error: 'User not found'});
    }
  }).then((data) => {
    userData.favs = [];
    data.forEach((doc) => {
      userData.favs.push({
        body: doc.data().body,
        createdAt: doc.data().createdAt,
        username: doc.data().username,
        userImage: doc.data().userImage,
        commentCount: doc.data().commentCount,
        favId: doc.data().id
      })
    });
    return res.json(userData);
  }).catch(err => {
    console.error(err);
    return res.status(500).json({error: err.code});
  })
}

// Owner user
exports.getAuthenticatedUser = (req, res) => {
  let userData = {}
  db.doc(`/users/${req.user.username}`).get()
    .then(doc => {
      if(doc.exists){
        userData.credentials = doc.data();
        return db.collection("likes").where('username', '==', req.user.username).get();
      }
      return res.status(500).json({error: err.code});
    })
    .then((data) => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db.collection('notifications').where('recipient', '==', req.user.username)
        .orderBy('createdAt', 'desc').limit(10).get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          favId: doc.data().favId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        })
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    })
}

exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  
  db.doc(`/users/${req.user.username}`).update(userDetails)
    .then(() => {
      return res.json({message: 'Details added successfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    });
};

exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers});

  let imageFileName;
  let imageToBeUploaded = {};

  let generatedToken = uuid();

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    //check again
      if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
          return res.status(400).json({error: 'Wrong file type submitted'});
      }
    //console.log(fieldname);
    //console.log(filename);
    //console.log(mimetype);
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
      ).toString()}.${imageExtension}`; // Random DEGISEBILIR
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {filepath, mimetype};
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {// ??
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata:{
          contentType: imageToBeUploaded.mimetype,
          firebaseStorageDownloadTokens: generatedToken,
        }
      }
    })
    .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
      return db.doc(`/users/${req.user.username}`).update({imageUrl});
    })
    .then(() => {
      return res.json({message: 'Image uploaded successfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    });
  });
  busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, {read: true});
  });

  batch.commit()
    .then(() => {
      return res.json({message: 'Notifications marked read'});
    }).catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    })
}

// KONTROL
exports.followUser = (req, res) => {
  const newFollow = {
    sender: req.user.username,
    receiver: req.params.username,
    followOn: new Date().toISOString(),
  };

  db.collection('follows')
    .add(newFollow)
    .then((doc) => {
      const resFollow = newFollow;
      newFollow.followId = doc.id;
      return res.json(resFollow);
    })
    .catch(err => {
      res.status(500).json({error: 'something went wrong'});
      console.error(err);
    });
}

exports.unfollowUser = (req, res) => {
  // ???
  const document = db.collection("follows").where('sender', '==', req.user.username).where('receiver', '==', req.params.username).get();
  document.get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Follow not found'});
      }
      if(doc.data().username !== req.user.username){ // ? username
        return res.status(403).json({error: 'Unauthorized'});
      } else {
        return document.delete();
      }
    })
    .then(() => {
      return res.json({message: 'Follow deleted successfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    })
}

exports.sendmessage = (req, res) => {
  const newMessage = {
    message: req.body.message,
    sender: req.user.username,
    receiver: req.params.username,
    status: 'notread',
    createdAt: new Date().toISOString(),
  };

  db.collection('messages')
    .add(newMessage)
    .then((doc) => {
      const resMessage = newMessage;
      newMessage.messageId = doc.id;
      return res.json(resMessage);
    })
    .catch(err => {
      res.status(500).json({error: 'something went wrong'});
      console.error(err);
    });
}

exports.getmessages = (req, res) => {
  db
    .collection("messages")
    .where('sender', '==', req.user.username)
    .where('receiver', '==', req.params.username)
    .orderBy('createdAt', 'desc') // COMplex query ??
    .get()
    .then(data => {
      let messages = [];
      data.forEach(doc => {
        messages.push({
          messageId: doc.id,
          message: doc.data().message
        })
      })
      return res.json(messages);
    }).catch(err => {
      return res.status(500).json({error: err.code});
    });
  
}

exports.getFollowing = (req, res) => {
  db.collection("follows")
  .where("sender", '==', req.user.username)
  .get()
  .then(data => {
    let following=[];
    data.forEach(doc => {
      following.push({
        followId: doc.id,
        following: doc.data().reciever
      });
    })
    return res.json(following);
  })
  .catch(err =>{
    console.log(err);
    return res.status(500).json({error: err.code});
  })
}

exports.getSimilarUsernames = (req, res) => {
  db.collection('users')
  .where('username', '>=', req.body.username)
  .limit(5)
  .get()
  .then(data => {
    let users = [];
    data.forEach(doc => {
      users.push({
        username: doc.data().username
      })
    });
    return res.json(users);
  }).catch(err =>{
    console.log(err);
    return res.status(500).json({error: err.code});
  })
}