//Carregando os módulos
const express = require("express")
const handlebars = require('express-handlebars')
const bodyParser = require("body-parser")
const app = express()
const admin = require('./routes/admin')
const path = require("path")
const mongoose = require("mongoose")
const session = require("express-session")
const flash = require("connect-flash")
require("./models/Postagem")
const Postagem = mongoose.model("postagens")
require("./models/Categoria")
const Categoria = mongoose.model("categorias")
const usuarios = require("./routes/usuario")
const passport = require("passport")
require("./config/auth")(passport)
const { eAdmin } = require("./helpers/eAdmin")
require('dotenv').config()
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const sessionSecret = process.env.SESSION_SECRET || 'chave-padrao-secreta';

//Configurações
//Sessão
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
//midleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg")
    res.locals.error_msg = req.flash("error_msg")
    res.locals.error = req.flash("error")
    res.locals.user = req.user || null;
    next()
})
//Body Parser
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// handlebars
app.engine('handlebars', handlebars.engine({ defaultLayout: 'main', extname: 'handlebars' }))
app.set('view engine', 'handlebars');
//mongoose

mongoose.Promise = global.Promise;

const remoteMongoURI = process.env.MONGO_URI;

mongoose.connect(remoteMongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conectado com o MongoDB remoto');
  })
  .catch((err) => {
    console.error('Erro ao se conectar com o MongoDB remoto:', err);
  });

const store = new MongoDBStore({
  uri: remoteMongoURI,
  collection: 'sessions' // Nome da coleção onde as sessões serão armazenadas no MongoDB
});

store.on('error', function (error) {
  console.error('Erro no MongoDB Session Store:', error);
});

// Configuração do express-session
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // Configuração do tempo de vida do cookie da sessão (1 dia)
  }
}));

// Public
app.use(express.static(path.join(__dirname, "public")))
//rotas
app.use('/admin', eAdmin, admin)

app.get('/', (req, res) => {
    Postagem.find().populate("categoria").sort({ data: "desc" }).lean().then((postagem) => {
        res.render("index", { postagem: postagem },)
    }).catch((err) => {
        req.flash("error_msg", "Ocorreu um erro interno")
        res.redirect("/404")
    })
})

app.get("/postagem/:slug", (req, res) => {
    Postagem.findOne({ slug: req.params.slug }).lean().then((postagem) => {
        if (postagem) {
            res.render("postagem/index", { postagem: postagem })
        } else {
            req.flash("error_msg", "Esta Postagem não existe")
            res.redirect("/")
        }
    }).catch((err) => {
        req.flash("error_msg", "Houve um erro interno")
        res.redirect("/")
    })
})
app.get("/404", (req, res) => {
    res.send("Erro 404")
})
app.get('/posts', (req, res) => {
    res.send("Paginda de posts")
})
app.get("/categorias", (req, res) => {
    Categoria.find().lean().then((categoria) => {
        res.render("categorias/index", { categoria: categoria })
    }).catch((err) => {
        req.flash("error_msg", "Houve um erro interno ao listar as categorias")
        res.redirect("/")
    })
})
app.get("/categorias/:slug", (req, res) => {
    Categoria.findOne({ slug: req.params.slug }).lean().then((categoria) => {
        if (categoria) {
            Postagem.find({ categoria: categoria._id }).lean().then((postagens) => {
                res.render("categorias/postagens", { postagens: postagens, categoria: categoria })


            }).catch((err) => {
                req.flash("error_msg", "Houve um erro ao listar os posts")
                res.redirect("/")
            })
        } else {
            req.flash("error_msg", "Esta Categoria não existe!")
            res.redirect("/")
        }
    }).catch((err) => {
        req.flash("error_msg", "Houve um erro interno ao carregar a pagina desta categoria")
        res.redirect("/")
    })
})
app.use("/usuarios", usuarios)

//Outros

const PORT = process.env.PORT || 8081
app.listen(PORT, () => {
    console.log("Servidor Rodando!")
})
