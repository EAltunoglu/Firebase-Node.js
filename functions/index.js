const functions = require('firebase-functions');

const app = require('express')();
const cors = require('cors');

const FavAuth = require('./util/favAuth');

const { db } = require('./util/admin');

const { getAllFavs, postOneFav, getFav, commentOnFav,
  likeFav, unlikeFav, deleteFav, getUserFavs } = require('./handlers/favs');
const { signup, login, uploadImage, addUserDetails,
  getAuthenticatedUser, getUserDetails,
  markNotificationsRead, followUser, unfollowUser,
  sendmessage, getmessages, getFollowing,
  getSimilarUsernames } = require('./handlers/users')

app.use(cors({origin: true}));

// Fav routes
app.get('/favs', getAllFavs);
app.post('/fav', FavAuth, postOneFav);
app.get('/fav/:favId', getFav);
app.post('/fav/:favId/comment', FavAuth, commentOnFav);
app.get('/fav/:favId/like', FavAuth, likeFav);
app.get('/fav/:favId/unlike', FavAuth, unlikeFav);
app.delete('/fav/:favId',FavAuth, deleteFav)
app.get('/fav/:username', getUserFavs);

// User routes
app.post('/signup', signup);
app.post('/login', login);

// User routes 2
app.post('/user/image', FavAuth, uploadImage);
app.post('/user', FavAuth, addUserDetails);
app.get('/user', FavAuth, getAuthenticatedUser);
app.get('/user/:username', getUserDetails);
app.post('/notifications', FavAuth, markNotificationsRead);

//Kontrol Edilmedi

app.post('/follow/:username', FavAuth, followUser);
app.delete('/disfollow/:username', FavAuth, unfollowUser);
app.post('/sendmessage/:username', FavAuth, sendmessage);
app.get('/getmessage/:username', FavAuth, getmessages);
app.get('/follow', FavAuth, getFollowing);
app.get('/search/user', getSimilarUsernames);

app.use(cors({origin: true}));

exports.api = functions.https.onRequest(app);
//.region

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    db.doc(`/favs/${snapshot.data().favId}`).get()
      .then(doc => {
        if(doc.exists && doc.data().username !== snapshot.data().username){
          return db.doc(`/notifications/${snapshot.id}`).set({
            postedOn: new Date().toISOString(),
            recipient: doc.data().username,
            sender: snapshot.data().username,
            type: 'like',
            read: false,
            favId: doc.id
          });
        }
        return res.status(200); // What to return
      })
      .catch(err => {
        console.log(err);
        return res.status(400).json({error: err.code});
      })
  })

  // region
exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
.onCreate((snapshot) => {
  db.doc(`/favs/${snapshot.data().favId}`).get()
    .then(doc => {
      if(doc.exists){
        return db.doc(`/notifications/${snapshot.id}`).set({
          postedOn: new Date().toISOString(),
          recipient: doc.data().username,
          sender: snapshot.data().username,
          type: 'comment',
          read: false,
          favId: doc.id
        });
      }
      return res.status(200); // Database trigger ??
    })
    .catch(err => {
      console.log(err);
      return res.status(400).json({error: err.code});
    })
})

// bot necessary ?
exports.deleteNotificationOnUnLike = functions.firestore.document('likes/{id}')
.onDelete((snapshot) => {
  db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch(err => {
      console.error(err);
      return;
    })
})

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
  .onUpdate((change) =>{
    console.log(change.before.data());
    console.log(change.after.data());
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
      console.log('image has changed')
      const batch = db.batch();
      return db.collection('favs').where('username', '==', change.before.data().username).get()
      .then((data) => {
        data.forEach(doc => {
          const fav = db.doc(`/favs/${doc.id}`);
          batch.update(fav, {userImage: change.after.data().imageUrl});
        })
        return batch.commit();
      })
    } else return true;
  })

exports.onFavDelete = functions.firestore.document('/favs/{favId}')
  .onDelete((snapshot, context) => {
    const favId = context.params.favId;
    const batch = db.batch();
    return db.collection('comments').where('favId', '==', favId).get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        })
        return db.collection('likes').where('favId', '==', favId);
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        })
        return db.collection('notifications').where('favId', '==', favId);
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        })
        return batch.commit();
      })
      .catch(err => console.error(err))
  })