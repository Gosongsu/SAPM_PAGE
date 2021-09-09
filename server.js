const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')


app.use(methodOverride('_method'))

app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

var db;

MongoClient.connect(config.mongoURI, function(error, client){
    if (error) return console.log(error)
    db = client.db('todoapp');

    // db.collection('post').insertOne({이름 : 'Gosongsu', 나이 : 26}, function(error, result){
    //     console.log('저장완료');
    // });

    app.listen(8080, function(){
        console.log('listening on 8080')
    });
})

app.use(express.urlencoded({extended: true})) 

// app.listen(8080, function(){
//     console.log('listening on 8080')
// });

app.get('/', function(req, res){
    // res.sendFile(__dirname + '/index.html')
    res.render('index.ejs')
});

app.get('/write', function(req, res){ 
    // res.sendFile(__dirname +'/write.html')
    res.render('write.ejs')
  });

app.get('/pet', function(req, res){
    res.send('펫 용품 사세요')
})



// DB리스트 확인
app.get('/list', function(req, res){
    db.collection('post').find().toArray(function(error, result){
        // console.log(result);
        res.render('list.ejs', { result : result });
    });
});


app.get('/search', (req, res) => {
    var SearchCondition = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: req.query.value,
                    path: ['제목', '날짜']
                }
            }
        },
        { $sort : { _id : 1 }}
    ]
    // console.log(req.query.value)
    db.collection('post').aggregate(SearchCondition).toArray((error, result) => {
        console.log(result)
        res.render('search.ejs', { result : result})
    })
})



app.get('/detail/:id', function(req, res){
    // try{
    //     id = parseInt(req.params.id);
    //     db.collection('post').findOne({_id : id}, function(err, resl) {
    //         console.log(err, resl);
    //         res.render('detail.ejs', {data : resl});
    //     });

        
        db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result){
            res.render('detail.ejs', { data : result });
        });
        
    // } catch(e) {
    //     console.error(e);
    // }
    
});

app.get('/edit/:id', function(req, res){
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(error, result){
        res.render('edit.ejs', { post : result })
    })
    // /2가 edit에 접속하면 2번게시물 제목 ,날짜를 edit.ejs로 보냄
})

app.put('/edit', function(req, res){
    // /edit로 put 요청하면 폼에 담긴 데이터를 가지고 db.collection 에다가 업데이트함
    db.collection('post').updateOne({ _id : parseInt(req.body.id) }, { $set : { 제목 : req.body.title, 날짜 : req.body.date }}, function(error, result){
        console.log('수정완료');
        res.redirect('/list')
    })
});





const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function(req, res){
    res.render('login.ejs')
});



app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), function(req, res){
    console.log('로그인성공');
    res.redirect('/')
});

app.get('/mypage', LoginDoneCheck, function(req, res){
    console.log(req.user)
    res.render('mypage.ejs', {user : req.user})
})

function LoginDoneCheck(req, res, next){
    if (req.user){
      next()
    } else {
      res.send('로그인 안하셨는뎅')
    }
}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (InputId, InputPw, done) {
    console.log(InputId, InputPw);
    db.collection('login').findOne({ id: InputId }, function (error, result) {
      if (error) return done(error)
  
      if (!result) return done(null, false, { message: '존재하지않는 아이디 입니다.' })
      if (InputPw == result.pw) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
  }));


passport.serializeUser(function(user, done){
    done(null, user.id)
});


passport.deserializeUser(function(did, done){
    db.collection('login').findOne({id : did}, function(error, result){
       done(null, result)
    })
});

app.get('/fail', function(req, res){
    console.log('로그인실패');
})


app.post('/register', function(req, res){
    db.collection('login').insertOne({ id : req.body.id, pw : req.body.pw }, function(error, result){
        res.redirect('/')
    })
})


// 폼전송
app.post('/add', function(req, res){
    res.send('전송완료');
    db.collection('counter').findOne({name : '게시물갯수'}, function(error, result){
        // console.log(result.totalPost)
        var TotalPost = result.totalPost;

        var save = { _id : TotalPost + 1, 작성자 : req.user._id, 제목 : req.body.title, 날짜 : req.body.date }
        if (!save.작성자){
            console.log('로그인 해주세요')
        } else{
            db.collection('post').insertOne(save, function(){
                console.log('저장완료');
                db.collection('counter').updateOne({name:'게시물갯수'},{ $inc : {totalPost:1} },function(error, result){
                    if(error){
                        return console.log(error)
                    }
                })
             });
        }
     
    });
    // console.log(req.body)
});


// 삭제
app.delete('/delete', function(req, res){
    console.log('삭제 요청 진행중');
    console.log(req.body);
    req.body._id = parseInt(req.body._id);

    var deletedate = { _id : req.body._id, 작성자 : req.user._id }
    db.collection('post').deleteOne(deletedate, function(error, result){
        console.log('삭제완료');
        if (error) {console.log(error)}
        res.status(200).send({ message : '성공했습니다'});
    })
})
