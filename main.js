var express = require('express')
const path = require('path')
var cons = require('consolidate');
const bodyParser = require('body-parser');
var R = require('ramda')
const mongoose = require('mongoose');
var session = require('express-session')
const MongoStore = require('connect-mongo')(session);

mongoose.connect('mongodb://caotic:12asterisco@cluster0-shard-00-00-y4w1r.mongodb.net:27017,cluster0-shard-00-01-y4w1r.mongodb.net:27017,cluster0-shard-00-02-y4w1r.mongodb.net:27017/alunos?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority', {useNewUrlParser: true});
var db = mongoose.connection;

var Schema = mongoose.Schema;
var monitores = new Schema({
    matricula : Number,
    nome : String,
    senha : String
  })

var monitoria = new Schema({
    id_monitor : Number,
    monitoria_lugar : String,
    dia : String,
    horario_monitoria : String,
    horario_terminio_monitoria : String
  })

var monitor = mongoose.model("monitor", monitores)

var monitorias = mongoose.model("monitorias", monitoria)

var app = express();
app.use(express.json());
app.engine('html', cons.swig)
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public/'));

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());
app.use(session({
    secret: 'monitoria_papelada',
    cookie: { secure: false, expires : false, httpOnly: false},
    store: new MongoStore({ url: 'mongodb://caotic:12asterisco@cluster0-shard-00-00-y4w1r.mongodb.net:27017,cluster0-shard-00-01-y4w1r.mongodb.net:27017,cluster0-shard-00-02-y4w1r.mongodb.net:27017/alunos?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority '}),
    httpOnly : false,
}));


function insertMon(res, id_monitor, place_mon, day, hour_mon, hour_mon_ter) {
    let monitoria_new = new monitorias({ id_monitor : id_monitor,
                                         monitoria_lugar : place_mon,
                                         dia : day,
                                         horario_monitoria : hour_mon,
                                         horario_terminio_monitoria : hour_mon_ter
                                       });
                    
    monitoria_new.save(function (err, f) {
        if (err) return console.error(err);
         res.redirect('/')
      });

   // let collec_m = db.collection('monitorias');
  //  collec_m.insert({'id_monitor': '23'})
}

function has_login(db, m_id, password, cont) {
    monitor.find({ matricula: m_id, senha : password }, function (e, f) {console.log(f); return cont(e, f)})
    return;
}

function get_Mon(m_id, cont) {
    monitorias.find({ id_monitor : m_id, }, function (e, f) {cont(e, f)})
}

function push_(g, f) {return R.insert(g.length+1, f, g);}

function showError(req, res, msg_error) {
    req.session.form_status = {error : true, msg : msg_error}
    req.session.save(() => res.redirect('/'))
}

let Maybe = {
 
    Just : (x) => {
      let try_ = {empty : false, value : x}
      return try_
    },

    Nothing : (optinal_msg = '') => {
      let try_ = {empty : true, msg_error : optinal_msg}
      return try_
   },
  
  match_optinal : (f, fx, x) => x.empty ? fx(x.msg_error) : f(x.value),
  bind : (x, f, op_msg = '') => Maybe.match_optinal(f, m => Maybe.Nothing(m), x)
 
}

app.get('/', function(request, res){
   if(request.session.user) {
        (f => {
          request.session.form_status = {error : false, msg : ''}
          request.session.save(() => 
            get_Mon(request.session.user.id, 
                (e, x) => res.render("dashboard.ejs", {login_error : false, msg : '',  user : request.session.user, form : f, moni : x})));
        }) (request.session.form_status)
        return;
    }

    res.render("index.ejs", {login_error : false, msg : ''});
});

app.post("/", 
  (req, res) => {
      const db = req.sessionStore.db
      const { m_id, pass_m } = req.body;

      let len = n => n.toString().length
      has_login(db, m_id, pass_m, (e, f) => {
        let cert_ID_M = n => p => [len(n) != 11 ? {ok : false, msg : "Matricula deve conter 11 caracteres"} : {ok : true},
                                   len(p) < 6 ? {ok : false, msg: "Senhas contem no minimo 6 caracters"} : {ok : true},
                                   f.length < 1 ? {ok : false, msg: "Usuario ou senha incorretos"} : {ok : true}
                                  ]
        
        const a = R.reduce((f, g) => (g.ok) ? f : push_(f, g.msg), [], cert_ID_M(m_id)(pass_m))
        if (a.length > 0) {
            res.render("index", {login_error : true, msg : a[0]})
        } else {
            req.session.user = {logged : true, info : f[0]}
            req.session.form_status = {error : false, msg : ''}
            req.session.save(() => res.redirect('/'))
        }
        })
     }
    );

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect('/'))
})

app.post("/add_mon", (req, res) => {
   const {place_mon, hour_mon, day_mon, hour_mon_ter} = req.body 

   if (!req.session.user) {
      res.redirect('/')
   }

   let certifi_forms = (place, hour, day, hour_ter) => {
       let certif_hour = (hour) => {
          let q = typeof(hour) == "string" ? hour.split(':') : null
          if (q && parseInt(q[0], 10) != NaN && parseInt(q[1], 10) != NaN && q[0] <= 24 && q[1] <= 60) {
            return Maybe.Just(hour)
          }
          return Maybe.Nothing("Você deve digitar uma hora valida")
        };
       
       return [
        (typeof(place) != "string" || place.length < 4) ?
           Maybe.Nothing("O lugar de monitoria deve ser algum lugar valido e conter mais de 4 caracteres") : Maybe.Just(place),
        certif_hour(hour),
         (() => {
            let q = typeof(day) == "string" ? day.split('-') : null;
            let v = q ? R.reduce((x, y) => (parseInt(x, 10) != NaN) && y, true, q) : null
            if (q && v && q[1] <= 12) {
                return Maybe.Just(day)
            }
            return Maybe.Nothing("Você deve digitar um dia valido")
         }) (),
         certif_hour(hour_ter)
   ]
  }

   let try_insert_mon = R.reduce((x, y) => {return !x.empty ? Maybe.bind(y, k => Maybe.Just(push_(x.value, k)), y.msg_error) : Maybe.Nothing(x.msg_error)}, Maybe.Just([]), certifi_forms(place_mon, hour_mon, day_mon, hour_mon_ter))
   Maybe.match_optinal(
       (x) => {
        console.log(req.session.user)
        insertMon(res, req.session.user._id, x[0], x[2], x[1], x[3])
       },
       (y) => showError(req, res, y),
       try_insert_mon
   )

})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
  });