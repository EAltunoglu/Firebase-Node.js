const { db } =require('../util/admin');

exports.getUserLists = (req, res) => {
    db.collection('lists')
    .where('username', '==', req.params.username)
    .get()
    .then(data => {
      let lists = [];
      data.forEach(doc => {
        lists.push({
          listId: doc.id,
          body: doc.data().body,
          username: doc.data().username,
          createdAt: doc.data().createdAt,
          imageUrl: doc.data().imageUrl,
          title: doc.data().title,
          updatedAt: doc.data().updatedAt,
          public: doc.data().public
        });
      });
      return res.json(lists);
    })
    .catch((err) => {
      console.error(err);
      res.status.json({error: err.code});
    })
}

exports.postList = (req, res) => {
    const newList = {
        body: req.body.body,
        username: req.user.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: req.body.title,
        public: req.body.public
    };

    db.collection('lists')
        .add(newList)
        .then((doc) => {
            const resList = newList;
            resList.listId = doc.id;
            return res.json(resList);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: 'something went wrong' });
        })
}

exports.addListItem = (req, res) => {
    const newItem = {
        type: req.body.type,
        createdAt: new Date().toISOString(),
        listId: req.params.listId,
        data: req.body.data
      };
      console.log(newItem);
      
      db.collection('listitems').add(newItem)
        .then(doc => {
            const resItem = newItem;
            resItem.itemId = doc.id;
            return res.json(resItem);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({error: 'Something went wrong item on add list item'});
        })
}

exports.getList = (req, res) => {
  //console.log("111111");
  
    let listData = {};
    db.doc(`/lists/${req.params.listId}`)
      .get()
      .then(doc => {
        if(!doc.exists){
          return res.status(404).json({ error: 'List not found'})
        }
        listData = doc.data();
        listData.listId = doc.id;
        //console.log("AAAA");
        //console.log(listData);
        return db
        .collection('listitems')
        .where('listId', '==', req.params.listId)
        .get();
      })
      .then((data) => {
        //console.log("BBBB");
        //console.log(data);
        listData.items = [];
        data.forEach(doc => {
          listData.items.push(doc.data())
        })
        return res.json(listData);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({error: err.code});
      })
  }