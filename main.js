var express = require('express')
const path = require('path')
var cons = require('consolidate');
const bodyParser = require('body-parser');
var R = require('ramda')
const mongoose = require('mongoose');
var session = require('express-session')
const MongoStore = require('connect-mongo')(session);

mongoose.connect('mongodb://caotic:12asterisco@cluster0-shard-00-00-y4w1r.mongodb.net:27017,cluster0-shard-00-01-y4w1r.mongodb.net:27017,cluster0-shard-00-02-y4w1r.mongodb.net:27017/alunos?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority', {
    useNewUrlParser: true
});
var db = mongoose.connection;

const bcrypt = require('bcrypt');
const saltRounds = 10;
const passord_hashing = 'eu vc e nos odiamos a papelada das monitorias';

mongoose.set('useFindAndModify', false)

var Schema = mongoose.Schema;
var monitores = new Schema({
    matricula: Number,
    nome: String,
    senha: String,
    unidade_curricular: String,
    supervisor: String,
    unidade_academica: String
})

var monitoria = new Schema({
    id_monitor: String,
    monitoria_lugar: String,
    dia: String,
    horario_monitoria: String,
    horario_terminio_monitoria: String,
    alunos: [Object]
})


var super_user = new Schema({
    usuario: String,
    senha: String
})

var monitor = mongoose.model("monitor", monitores)

var monitorias = mongoose.model("monitorias", monitoria)

var admin_accounts = mongoose.model("super_user", super_user)

var app = express();
app.use(express.json());
app.engine('html', cons.swig)
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public/'));

app.use(express.urlencoded({
    extended: true
}));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());
app.use(session({
    secret: 'monitoria_papelada',
    cookie: {
        secure: false,
        expires: false,
        httpOnly: false
    },
    store: new MongoStore({
        url: 'mongodb://caotic:12asterisco@cluster0-shard-00-00-y4w1r.mongodb.net:27017,cluster0-shard-00-01-y4w1r.mongodb.net:27017,cluster0-shard-00-02-y4w1r.mongodb.net:27017/alunos?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority '
    }),
    httpOnly: false,
}));


function insertMon(res, id_monitor, place_mon, day, hour_mon, hour_mon_ter) {
    let monitoria_new = new monitorias({
        id_monitor: id_monitor,
        monitoria_lugar: place_mon,
        dia: day,
        horario_monitoria: hour_mon,
        horario_terminio_monitoria: hour_mon_ter,
        alunos: []
    });

    monitoria_new.save(function(err, f) {
        if (err) return console.error(err);
        res.redirect('/')
    });

    // let collec_m = db.collection('monitorias');
    //  collec_m.insert({'id_monitor': '23'})
}

function insertMonitor(m, n, ua, uc, sup, password, f_) {
    bcrypt.hash(password, saltRounds, function(err, hash) {
        let monitor_new = new monitor({
            matricula: m,
            nome: n,
            unidade_academica: ua,
            unidade_curricular: uc,
            supervisor: sup,
            senha: hash
        });
        console.log(m, n, ua, uc, sup)
        monitor_new.save(function(err, f) {
            if (err) return console.error(err);
            f_()
        });
    })

    // let collec_m = db.collection('monitorias');
    //  collec_m.insert({'id_monitor': '23'})
}

function insertSuperUser(user, password, f_) {

    bcrypt.hash(password, saltRounds, function(err, hash) {

        let admin_new = new admin_accounts({
            usuario: user,
            senha: hash
        });

        admin_new.save(function(err, f) {
            if (err) return console.error(err);
            f_()
        });
    })

    // let collec_m = db.collection('monitorias');
    //  collec_m.insert({'id_monitor': '23'})
}

function has_login(m_id, password, cont) {
    monitor.find({
        matricula: m_id
    }, async (e, f) => {
        let n = []
        for (let i = 0; i <= f.length - 1; i++) {
            if (await bcrypt.compare(password, f[i].senha)) {
                n.push(f[i])
            }
        }

        return cont(e, n)
    })
    return;
}

function has_super_login(user, password, cont) {
    admin_accounts.find({
        usuario: user
    }, async (e, f) => {
        let n = []
        for (let i = 0; i <= f.length - 1; i++) {
            if (await bcrypt.compare(password, f[i].senha)) {
                n.push(f[i])
            }
        }

        return cont(e, n)
    })
}

function exist_login(m_id, cont) {
    monitor.find({
        matricula: m_id
    }, function(e, f) {
        console.log(f);
        return cont(e, f)
    })
    return;
}

function get_Mon(m_id, cont) {
    monitorias.find({
        id_monitor: m_id,
    }, function(e, f) {
        cont(e, f)
    })
}

function get_allMon(cont) {
    monitor.find({}, function(e, f) {
        cont(e, f)
    })
}

function get_Mon_by_Id(m_id, monitoria_id, cont) {
    monitorias.find({
        _id: monitoria_id,
        id_monitor: m_id
    }, function(e, f) {
        cont(e, f)
    })
}

async function delete_mon(m_id, count) {
    monitorias.deleteOne({
        _id: m_id
    }, function(err) {
        count()
    });
}

function add_student_mon(id, m_id, name, id_m_s, fx) {
    monitorias.findOneAndUpdate({
        _id: m_id,
        id_monitor: id
    }, {
        $push: {
            'alunos': {
                "nome": name,
                "matricula": id_m_s
            }
        }
    }, {
        upsert: true,
        new: true
    }, function(e, f) {
        fx()
    })
}

function push_(g, f) {
    return R.insert(g.length + 1, f, g);
}

function showError(req, res, msg_error) {
    req.session.form_status = {
        error: true,
        msg: msg_error
    }
    req.session.save(() => res.redirect('/'))
}

let Maybe = {

    Just: (x) => {
        let try_ = {
            empty: false,
            value: x
        }
        return try_
    },

    Nothing: (optinal_msg = '') => {
        let try_ = {
            empty: true,
            msg_error: optinal_msg
        }
        return try_
    },

    match_optinal: (f, fx, x) => x.empty ? fx(x.msg_error) : f(x.value),
    bind: (x, f, op_msg = '') => Maybe.match_optinal(f, m => Maybe.Nothing(m), x)

}

app.get('/', function(request, res) {
    if (request.session.user) {
        (f => {
            request.session.form_status = {
                error: false,
                msg: ''
            }
            request.session.save(() =>
                get_Mon(request.session.user.info._id,
                    (e, x) => res.render("dashboard.ejs", {
                        login_error: false,
                        msg: '',
                        user: request.session.user,
                        form: f,
                        moni: x
                    })));
        })(request.session.form_status)
        return;
    }

    res.render("index.ejs", {
        login_error: false,
        msg: ''
    });
});

app.post("/",
    (req, res) => {
        const db = req.sessionStore.db
        const {
            m_id,
            pass_m
        } = req.body;

        let len = n => n.toString().length
        has_login(m_id, pass_m, (e, f) => {
            let cert_ID_M = n => p => [len(n) != 11 ? {
                    ok: false,
                    msg: "Matricula deve conter 11 caracteres"
                } : {
                    ok: true
                },
                len(p) < 6 ? {
                    ok: false,
                    msg: "Senhas contem no minimo 6 caracters"
                } : {
                    ok: true
                },
                f.length < 1 ? {
                    ok: false,
                    msg: "Usuario ou senha incorretos"
                } : {
                    ok: true
                }
            ]

            const a = R.reduce((f, g) => (g.ok) ? f : push_(f, g.msg), [], cert_ID_M(m_id)(pass_m))
            if (a.length > 0) {
                res.render("index", {
                    login_error: true,
                    msg: a[0]
                })
            } else {
                req.session.user = {
                    logged: true,
                    info: f[0]
                }
                req.session.form_status = {
                    error: false,
                    msg: ''
                }
                req.session.save(() => res.redirect('/'))
            }
        })
    }
);

app.get("/logout", (req, res) => {
    if (!req.session.user) {
        res.redirect('/')
    }

    req.session.destroy(() => res.redirect('/'))
})

app.post("/add_mon", (req, res) => {
    const {
        place_mon,
        hour_mon,
        day_mon,
        hour_mon_ter
    } = req.body

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
            })(),
            certif_hour(hour_ter)
        ]
    }

    let try_insert_mon = R.reduce((x, y) => {
        return !x.empty ? Maybe.bind(y, k => Maybe.Just(push_(x.value, k)), y.msg_error) : Maybe.Nothing(x.msg_error)
    }, Maybe.Just([]), certifi_forms(place_mon, hour_mon, day_mon, hour_mon_ter))
    Maybe.match_optinal(
        (x) => {
            insertMon(res, req.session.user.info._id, x[0], x[2], x[1], x[3])
        },
        (y) => showError(req, res, y),
        try_insert_mon
    )

})

app.post("/delete_mon", (req, res) => {

    if (!req.session.user || !req.body.id_moni) {
        res.redirect('/')
    }

    get_Mon_by_Id(req.session.user.info._id, req.body.id_moni, (e, f) => {
        R.map((x) => {
            delete_mon(x, () => {})
        }, f)
    })

    res.json("refresh")
})


app.get("/edit_mon", (req, res) => {
    if (!req.session.user) {
        res.redirect('/')
    }

    get_Mon(req.session.user.info._id, (e, f) => res.render("edit_mon", {
        user: req.session.user,
        monitorias: f
    }))
})

app.post("/add_student", (req, res) => {
    const {
        id_m,
        matricula,
        name
    } = req.body;
    if (!req.session.user || !id_m || !matricula || !name) {
        res.redirect('/')
    }

    get_Mon_by_Id(req.session.user.info._id, id_m, (e, f) => {
        if (f.length < 1) {
            res.redirect('/')
        }
    })

    add_student_mon(req.session.user.info._id, id_m, name, matricula, () => res.json("refresh"))
})

app.get("/mpdf", (req, res) => {
    if (!req.session.user) {
        res.redirect('/')
    }

    get_Mon(req.session.user.info._id, (e, f) => res.render("pdf", {
        user: req.session.user,
        monitorias: f
    }))
})

app.get("/admin", (req, res) => {
    if (!req.session.admin) {
        res.render("login_admin")
        return;
    }

    get_allMon((_, m) => res.render("panel", {
        monitores: m
    }))
})

app.post("/add_user", (req, res) => {
    const {
        m_,
        name,
        ua,
        uc,
        sup,
        pass
    } = req.body
    console.log(req.body)
    if (!req.session.admin || !m_ || !name || !ua || !uc || !sup) {
        return;
    }

    if (parseInt(m_, 10) == NaN || m_.toString().length < 11) {
        res.json({
            sucess: false,
            msg: "Matricula incorreta"
        })
        return;
    }

    if (pass.toString().length < 6) {
        res.json({
            sucess: false,
            msg: "Senha deve conter no minimo 6 caracteres"
        })
        return;
    }

    exist_login(m_, (e, f) => {
        if (f.length > 0) {
            res.json({
                sucess: false,
                msg: "Monitor já cadastrado"
            })
            return;
        }

        insertMonitor(m_, name, ua, uc, sup, pass, () =>
            res.json({
                sucess: true,
                msg: ""
            })
        )
    })

})

app.post("/admin_login", (req, res) => {
    const {
        user,
        pass
    } = req.body
    let negation = () => res.json({
        allowed: false,
        msg: "Permissão de login negada!"
    })
    console.log(req.body)
    if (!user || !pass) { // replace this after
        negation()
        return;
    }

    has_super_login(user, pass, (e, f) => {
        if (f.length < 1) {
            negation();
            return;
        }
        req.session.admin = true
        req.session.save(() => res.json({
            allowed: true,
            msg: ''
        }))
    })
})

app.post("/logout_admin", (req, res) => {
    req.session.admin = false;
    req.session.save(() => res.json({
        sucess: true
    }))
})


app.listen(process.env.PORT || 8080, t => {});
