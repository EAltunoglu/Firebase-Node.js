const functions = require("firebase-functions");

const app = require("express")();
const cors = require("cors");

const FavAuth = require("./util/favAuth");

const { db } = require("./util/admin");

const {
  getAllFavs,
  postOneFav,
  getFav,
  commentOnFav,
  likeFav,
  unlikeFav,
  deleteFav,
  getUserFavs,
} = require("./handlers/favs");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
  followUser,
  unfollowUser,
  sendmessage,
  getmessages,
  getFollowing,
  getSimilarUsernames,
  getAllMessages,
  whoToFollow
} = require("./handlers/users");

const { getUserLists,
  postList,
  addListItem,
  getList } = require("./handlers/lists");

app.use(cors({ origin: true }));

// Fav routes
app.get("/favs", getAllFavs);
app.post("/fav", FavAuth, postOneFav);
app.get("/fav/:favId", getFav);
app.post("/fav/:favId/comment", FavAuth, commentOnFav);
app.get("/fav/:favId/like", FavAuth, likeFav);
app.get("/fav/:favId/unlike", FavAuth, unlikeFav);
app.delete("/fav/:favId", FavAuth, deleteFav);
app.get("/fav/sub/:username", getUserFavs);

// List routes
app.get("/lists/:username", getUserLists);
app.post("/lists", FavAuth, postList);
app.post("/lists/:listId/add", FavAuth, addListItem);
app.get("/lists/:listId/get", getList);

// User routes
app.post("/signup", signup);
app.post("/login", login);

// User routes 2
app.post("/user/image", FavAuth, uploadImage);
app.post("/user", FavAuth, addUserDetails);
app.get("/user", FavAuth, getAuthenticatedUser);
app.get("/user/:username", getUserDetails);
app.post("/notifications", FavAuth, markNotificationsRead);
app.get("/follow/:username", FavAuth, followUser);
app.get("/unfollow/:username", FavAuth, unfollowUser);
app.post("/search/user", getSimilarUsernames);
app.get("/whotofollow", whoToFollow);

//Kontrol Edilmedi
app.post("/sendmessage/:username", FavAuth, sendmessage);
app.get("/getmessage/:username", FavAuth, getmessages);
app.get("/user/messages", FavAuth, getAllMessages);

// AA
app.get("/follow", FavAuth, getFollowing);

app.use(cors({ origin: true }));

exports.api = functions.https.onRequest(app);
//.region

exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    db.doc(`/favs/${snapshot.data().favId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().username,
            sender: snapshot.data().username,
            type: "like",
            read: false,
            favId: doc.id,
          });
        }
        return null;
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  });

// region
exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    db.doc(`/favs/${snapshot.data().favId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().username,
            sender: snapshot.data().username,
            type: "comment",
            read: false,
            favId: doc.id,
          });
        }
        return null;
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  });

// Not necessary
exports.deleteNotificationOnUnLike = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return null;
      });
  });

exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("favs")
        .where("username", "==", change.before.data().username)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const fav = db.doc(`/favs/${doc.id}`);
            batch.update(fav, { userImage: change.after.data().imageUrl });
          });
          return db
            .collection("comments")
            .where("username", "==", change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const comment = db.doc(`/comments/${doc.id}`);
            batch.update(comment, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return null;
  });

// EXTRA

exports.onFavDelete = functions.firestore
  .document("/favs/{favId}")
  .onDelete((snapshot, context) => {
    const favId = context.params.favId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("favId", "==", favId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("favId", "==", favId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db.collection("notifications").where("favId", "==", favId);
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });

exports.createNotificationOnMessage = functions.firestore
  .document("/messages/{messageId}")
  .onCreate((snapshot) => {
    db.doc(`/messages/${snapshot.data().messageId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().username !== snapshot.data().username) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(), // create ? post
            recipient: doc.data().username,
            sender: snapshot.data().username,
            type: "message",
            read: false,
            messageId: doc.id,
          });
        }
        return null; // What to return
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  });
