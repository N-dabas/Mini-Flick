var express          = require("express"),
    app              = express(),
    bodyParser       = require("body-parser"),
    mongoose         = require("mongoose"),
    flash            = require("connect-flash"),
    passport         = require("passport"),
    localpass        = require("passport-local"),
    Movie            = require("./models/movie.js"),
    User             = require("./models/user.js"),
    express_session  = require("express-session"),
    request          = require("request"),
    methodoverride   = require("method-override"),
    Comment          = require("./models/comment.js")

mongoose.Promise = global.Promise;
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
mongoose.connect("mongodb://localhost/mfinder");
app.use(express.static("public"));
app.use(methodoverride("_method"));

app.use(express_session({
    secret:"Rusty is the best and cutest dog in the world",
    resave:false,
    saveUninitialized:false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localpass(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentuser=req.user;
    res.locals.error= req.flash("error");
    res.locals.success= req.flash("success");
    next();
});


app.get("/",function(req,res){
    res.render("landing.ejs");
})

app.get("/search",function(req,res){
    res.render("search.ejs");
})



app.get("/results", function(req, res){
    var keyword=req.query.search;
    var url="http://www.omdbapi.com/?s="+keyword+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body)
          res.render('results',{ data:data , keyword:keyword })
      }
   });
});

app.get("/addreview/:id",function(req,res){
    var movie_id=req.params.id;
    var url="http://www.omdbapi.com/?i="+movie_id+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body)
          res.render('addreview.ejs',{ movie:data })
      }
   });
})

app.post("/addreview/:id",function(req,res){
    var review=req.body.review;
    var movie_id=req.params.id;
    var author={
        id:req.user._id,
        username:req.user.username
    }
    var url="http://www.omdbapi.com/?i="+movie_id+"&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var data=JSON.parse(body)
          var new_review={ mid:movie_id, review:review, data:data, author:author};
          Movie.create(new_review,function(err,new_movie){
              if(err){
                  console.log(err);
              }
              else{
                  // console.log(new_movie);
                  res.redirect("/home");
              }
          })

      }
  });
})

app.get("/movie/:id", function(req, res){
    var url="http://www.omdbapi.com/?i="+req.params.id+"&plot=full&apikey=thewdb"
    request(url, function(error, response, body){
      if(!error && response.statusCode==200){
          var movie=JSON.parse(body)
          res.render('movie.ejs',{ movie:movie })
          // console.log(movie);
      }
   });
});


//================
// User Search
//================

app.get("/uSearch",function(req,res){
    var username=req.query.user_key;
    User.find({username:new RegExp(username)},function(err,users){
        res.render("usearch.ejs",{users:users, key:username})
    })
})


app.get("/user/:id",function(req,res){
    User.findById(req.params.id,function(err,user){
        Movie.find({'author.username':user.username},function(err,movies){
            // console.log(user.fname);
            // console.log(user.Gender);
            // console.log(user);
            // console.log(movies);
            res.render("uprofile.ejs",{user:user, movies:movies})

        })
    })

})


app.post("/follow/:follower/:master",function(req,res){

    User.findById(req.params.follower,function(err,user){
        user.followed.push(req.params.master);
        user.save();
        res.redirect("/user/"+req.params.master)
    })
    User.findById(req.params.master,function(err,user){
        user.followers.push(req.params.follower);
        user.save();
    })
})

app.post("/unfollow/:follower/:master",function(req,res){

    User.update({ _id: req.params.follower }, { "$pull": { "followed": req.params.master }}, { safe: true, multi:true },function(err, obj){
        res.redirect("/user/"+req.params.master)
    });
    User.update({ _id: req.params.master }, { "$pull": { "followers": req.params.follower }}, { safe: true, multi:true },function(err, obj){
    });


})



//================
//Profile Routes
//================

//EDIT Profile

app.get("/user/:id/edit",function(req,res){
    User.findById(req.params.id,function(err,user){
        res.render("editprofile.ejs",{ user:user })
    })


});

//UPDATE Profile

app.put("/user/:id/edit",function(req,res){
    User.findByIdAndUpdate(req.params.id, req.body.user,function(err,updatedcomment){
        if(err){
            res.redirect("/home");
        }
        else{
            res.redirect("/home");
        }

    })

})



//===================
//Watchlist Routes
//===================

app.post("/addwatchlist/:id/:movie_id/add",function(req,res){
    User.findOne({_id:req.params.id},{"watchlist": {"$elemMatch": {"imdb_id":req.body.newmovie.imdb_id}}},function(err,movie){
        if(movie.watchlist.length == 0)
        {
            User.findById(req.params.id,function(err,user){
                user.watchlist.push(req.body.newmovie);
                user.save();
                res.redirect("/watchlist/"+req.params.id);
            })
        }
        else
        {
            console.log("This movie is already in you watchlist");
            res.redirect("/watchlist/"+req.params.id);
        }

    })


});


// app.post("/addwatchlist/:id/:movie_id/add",function(req,res){
//     User.findOne({_id:req.params.id},{"watchlist": {"$elemMatch": {"imdb_id":req.params.movie_id}}},function(err,movie){
//         console.log(movie.watchlist.imdb_id);
//         res.redirect("/watchlist/"+req.params.id);

//     })
// });

app.get("/watchlist/:id",function(req,res){
    User.findById(req.params.id,function(err,user){
        res.render("watchlist.ejs",{user:user})
    })
})


// app.post("/watchlist/:id/remove",function(req,res){
//     User.findById(req.params.id,function(err,user){
//         console.log(user.watchlist);
//         console.log(req.body.newmovie.name);
//         user.watchlist.pull({"name":req.body.newmovie.name});
//         res.redirect("/watchlist/"+req.params.id);

//     })
// });

app.post("/watchlist/:id/remove",function(req,res){
    var delmovie=req.body.newmovie.name;
    User.update({ _id: req.params.id }, { "$pull": { "watchlist": { "name": req.body.newmovie.name } }}, { safe: true, multi:true },function(err, obj){
    res.redirect("/watchlist/"+req.params.id);
});
});




//===============
//COMMENT ROUTES
//===============


//NEW COMMENT

app.get("/review/:id/comments/new",function(req,res){
    Movie.findById(req.params.id,function(err,movie){
        if(err){
            console.log(err);
        }
        else{
            res.render("newcomment.ejs",{movie:movie});
        }
    })
})

app.post("/review/:id/comments",function(req,res){
    Movie.findById(req.params.id,function(err,movie){
        if(err){
            console.log(err);
            res.redirect("/home");
        }
        else{
            Comment.create(req.body.comment,function(err,comment){
                comment.author.id=req.user._id;
                comment.author.username=req.user.username;
                comment.save();
                movie.comments.push(comment);
                movie.save();
                res.redirect("/review/"+ movie.id);
            });
        }
    });
});

//EDIT COMMENT

app.get("/review/:id/comments/:comment_id/edit",function(req,res){
    Comment.findById(req.params.comment_id,function(err,comment){
        res.render("editcomment.ejs",{ movie_id:req.params.id, comment:comment})
    })


});

//UPDATE COMMENT

app.put("/review/:id/comments/:comment_id/edit",function(req,res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment,function(err,updatedcomment){
        if(err){
            res.redirect("/review/"+req.params.id);
        }
        else{
            res.redirect("/review/"+req.params.id);
        }

    })

})

//DELETE COMMENT

app.delete("/review/:id/comments/:comment_id",function(req,res){
    Comment.findByIdAndRemove(req.params.comment_id,function(err,commdel){
        if(err){
            res.redirect("/review/"+req.params.id);
        }
        else{

            res.redirect("/review/"+req.params.id);
        }
    })
})


//=============
//REVIEW ROUTES
//=============


//SHOW

app.get("/review/:id",function(req,res){
    Movie.findById(req.params.id).populate("comments").exec(function(err,movie){
        if(err){
            console.log(err);
        }
        else{

            res.render("review.ejs",{ movie:movie })
        }
    })

})

//EDIT

app.get("/review/:id/edit",function(req,res){
    Movie.findById(req.params.id,function(err,movie){
         res.render("edit.ejs", {movie: movie});
    })

})

//UPDATE

app.put("/review/:id",function(req,res){
    Movie.findByIdAndUpdate(req.params.id, req.body.movie,function(err,updatedmovie){
        if(err){
            res.redirect("/home");
        }
        else{
            res.redirect("/review/"+req.params.id);
        }
    })
})

//DELETE

app.delete("/review/:id",function(req,res){
    Movie.findByIdAndRemove(req.params.id,function(err,moviedeleted){
        if(err){
            res.redirect("/home");
        }
        else{
            res.redirect("/home");
        }
    })
})

//===================
//Register and Save
//===================

app.get("/register",function(req,res){
    res.render("register.ejs");
})


app.post("/register",function(req,res){
    var newuser= new User({username:req.body.username, interest:req.body.interests ,fname:req.body.fname, lname:req.body.lname,factor:req.body.factor,fmovie:req.body.fmovie });
    User.register(newuser,req.body.password,function(err,user){
        if(err){
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            res.redirect("/home");
        });
    });
});

//===========
//Followers and Following
//===========

app.get("/followed/:userid",function(req,res){
  User.findById(req.params.userid,function(err,user){
    User.find({'_id':{'$in':user.followed}},function(err,userdata){
      res.render("followed.ejs",{userdata:userdata})
    })
  })
})

app.get("/followers/:userid",function(req,res){
  User.findById(req.params.userid,function(err,user){
    User.find({'_id':{'$in':user.followers}},function(err,userdata){
      res.render("followers.ejs",{userdata:userdata})
    })
  })
})

//=============
// Login form
//=============

app.get("/login", function(req,res){
    res.render("login");
})

app.get("/home",function(req,res){
    User.findById(req.user._id,function(err,user){
            Movie.find({'author.id':req.user._id},function(err,mymovies){
                Movie.find({'author.id':{'$in':user.followed}},function(err,all_movies){
                res.render("home.ejs", {all_movies:all_movies, my_movies:mymovies, userinfo:user});
                })
            })
    })
})

app.post("/login",passport.authenticate("local",
    {
        successRedirect:"/home",
        failureRedirect:"/login"
    }), function(req,res){

        res.redirect("/home",{});
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/login");
});


app.listen(process.env.PORT, process.env.IP, function(){
    console.log(" The app has started !!")
});
