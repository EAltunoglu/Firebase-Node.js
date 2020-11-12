const { db } =require('../util/admin');

exports.getAllFavs = (req, res) => {
  db.collection('favs')
  .orderBy('createdAt', 'desc')
  .get()
  .then(data => {
    let favs = [];
    data.forEach(doc => {
      favs.push({
        favId: doc.id,
        body: doc.data().body,
        username: doc.data().username,
        createdAt: doc.data().createdAt,
        commentCount: doc.data().commentCount,
        likeCount: doc.data().likeCount,
        userImage: doc.data().userImage
      });
    });
    return res.json(favs);
  })
  .catch((err) => {
    console.error(err);
    res.status.json({error: err.code});
  })
}

exports.postOneFav = (req, res) => {
  
  if(req.body.body.trim() === ''){
    return res.status(400).json({ body: 'Body must not be empty'});
  }
  
  const newFav = {
    body: req.body.body,
    //favName: req.body.favName, Eklenecek fıeldlar mesela
    username: req.user.username,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection('favs')
    .add(newFav)
    .then((doc) => {
      const resFav = newFav;
      newFav.favId = doc.id;
      return res.json(resFav);
    })
    .catch(err => {
      res.status(500).json({error: 'something went wrong'});
      console.error(err);
    });
}

exports.getFav = (req, res) => {
  let favData = {};
  db.doc(`/favs/${req.params.favId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Fav not found'})
      }
      favData = doc.data();
      favData.favId = doc.id;
      return db.collection('comments')
      .orderBy('createdAt', 'desc') // Complex query
      .where('favId', '==', req.params.favId).get();
      //return res.status(400).json({error: 'Get fav Error'});
    }).then( data => {
      favData.comments = [];
      data.forEach(doc => {
        favData.comments.push(doc.data())
      })
      return res.json(favData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({error: err.code});
    })
}

exports.commentOnFav = (req, res) => {
  if(req.body.body.trim() === ''){
    return res.status(400).json({ error: 'Must not be empty', comment: 'Must not be empty'});
  }

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    favId: req.params.favId,
    username: req.user.username,
    userImage: req.user.imageUrl
  };
  console.log(newComment);

  db.doc(`/favs/${req.params.favId}`).get()
    .then((doc) => {
      if(!doc.exists){
        return res.status(404).json({error: 'Fav not found'});
      }
      return doc.ref.update({commentCount: doc.data().commentCount + 1});
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      return res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({error: 'Something went wrong comment on fav'});
    })
}

// SIKINTI
exports.likeFav = (req, res) => {
  const likeDocument = db
  .collection('likes')
  .where('username', '==', req.user.username)
  .where('favId', '==', req.params.favId)
  .limit(1);
  
  const favDocument = db.doc(`/favs/${req.params.favId}`);

  let favData;
  
  favDocument.get()
      .then((doc) => {
        if(doc.exists){
          favData = doc.data();
          favData.favId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({error: "Fav not found"});
        }
      })
      .then((data) => {
        if(data.empty){
          return db.collection('likes').add({
            favId: req.params.favId,
            username: req.user.username
          })
          .then(() => {
            favData.likeCount++
            return favDocument.update({likeCount: favData.likeCount})
          })
          .then(() => {
            return res.json(favData);
          })
        } else {
          return res.status(400).json({error: "Fav already liked"});
        }
      }).catch(err => {
        console.log(err);
        res.status(500).json({error: err.code});
      })
}

exports.unlikeFav = (req, res) => {
  const likeDocument = db
  .collection('likes')
  .where('username', '==', req.user.username)
  .where('favId', '==', req.params.favId)
  .limit(1);

  const favDocument = db.doc(`/favs/${req.params.favId}`);

  let favData;

  favDocument
    .get()
    .then((doc) => {
      if(doc.exists){
        favData = doc.data();
        favData.favId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({error: "Fav not found"});
      }
    })
    .then((data) => {
      if(data.empty){
        return res.status(400).json({error: "Fav not liked"});
      } else {
        // KONTROL
        return db
        .doc(`likes/${data.docs[0].id}`)
        .delete()
        .then(() => {
          favData.likeCount--;
          return favDocument.update({likeCount: favData.likeCount});
        })
        .then(() => {
          return res.json(favData);
        })
    }})
    .catch(err => {
      console.log(err);
      res.status(500).json({error: err.code});
    })
}

exports.getUserFavs = (req, res) => {
  db.collection('favs')
  .where('username', '==', req.params.username)
  .orderBy('createdAt', 'desc')
  .get()
  .then(data => {
    let favs = [];
    data.forEach(doc => {
      favs.push({
        favId: doc.id,
        body: doc.data().body,
        username: doc.data().username,
        createdAt: doc.data().createdAt,
        commentCount: doc.data().commentCount,
        likeCount: doc.data().likeCount,
        userImage: doc.data().userImage
      });
    });
    return res.json(favs);
  })
  .catch((err) => {
    console.error(err);
    res.status.json({error: err.code});
  })
}

exports.deleteFav = (req, res) => {
  const document = db.doc(`/favs/${req.params.favId}`);
  document.get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Fav not found'});
      }
      if(doc.data().username !== req.user.username){ // username
        return res.status(403).json({error: 'Unauthorized'});
      } else {
        return document.delete();
      }
    })
    .then(() => {
      return res.json({message: 'Fav deleted successfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code});
    })
}