var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var axios = require('axios');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var path = require('path');
var expressSession = require('express-session');
var qs = require('querystring');
var bodyParser = require('body-parser');
var sharedsession = require("express-socket.io-session");
var session = expressSession({
	secret: 'aUre3lx52',
	resave: true,
    saveUninitialized: true,
    cookie: {
        path: '/',
        httpOnly: false,
        secure: false,
        maxAge: null
    }
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser());
app.engine('html', cons.swig);
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'html');
app.use(session);
io.use(sharedsession(session, cookieParser(), {
	autoSave: true
})); 

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

var api = 'http://api.messenger.io/v1';
var onlineUsers = [];
var allUsers = [];
var sessions = [];
var messages = [];

function requiresLogin(req, res, next) {
	if (req.session && req.session.user) {
		return next();
	} else {
		return res.redirect("/login");
	}
}

function reloadMessages(emit) {
	axios.get(api+'/messages').then(function (response) {
		if(response.status == 200) {
			if(response.data.code == 200) {
				messages = response.data.data;
				if(emit) {
					io.sockets.emit('messages', messages);
				}
			}
		}
	}).catch(function (error) {
		console.log(error);
	});
}

function getAllUsers(emit) {
	axios.get(api+'/users').then(function (response) {
		if(response.status == 200) {
			if(response.data.code == 200) {
				allUsers = response.data.data;
				if(emit) {
					io.sockets.emit('get all users', allUsers);
				}
			}
		}
	}).catch(function (error) {
		console.log(error);
	});
}

function removeUser(id) {
	axios.post(api+'/user/' + id + '/remove').then(function(response) {
		if(response.status == 200) {
			if(response.data.code == 200) {
				console.log(response.data.message);
				getAllUsers(true);
			} else {
				console.log(response.data.message);
			}
		} else {
			console.log(response.status);
		}
	}).catch(function(error) {
		console.log(error);
	});
}

reloadMessages(false);
getAllUsers(false);

function generateProfileImage() {
	var pics = ["https://randomuser.me/api/portraits/lego/0.jpg","https://randomuser.me/api/portraits/lego/1.jpg",
	"https://randomuser.me/api/portraits/lego/2.jpg","https://randomuser.me/api/portraits/lego/3.jpg",
	"https://randomuser.me/api/portraits/lego/4.jpg","https://randomuser.me/api/portraits/lego/5.jpg",
	"https://randomuser.me/api/portraits/lego/6.jpg","https://randomuser.me/api/portraits/lego/7.jpg",
	"https://randomuser.me/api/portraits/lego/8.jpg","https://randomuser.me/api/portraits/lego/9.jpg"];
	return pics[Math.floor(Math.random()*pics.length)];
}

function getUserOnlinPositionBy(id) {
	for (var i = onlineUsers.length - 1; i >= 0; i--) {
		if(onlineUsers[i].id == id) {
			return i;
		}
	}
}

function getAllUserPositionBy(id) {
	for (var i = allUsers.length - 1; i >= 0; i--) {
		if(allUsers[i].id == id) {
			return i;
		}
	}
}

function inOnlineUser(id) {
	for (var i = onlineUsers.length - 1; i >= 0; i--) {
		if(onlineUsers[i].id == id) {
			return true;
		}
	}
	return false;
}

app.get('/', requiresLogin, function(req, res, next) {
	res.status(200).render("index");
});

app.get('/users', requiresLogin, function(req, res, next) {
	var user = req.session.user;
	if(user.role == 1) {
		res.status(200).render("usuarios");
	} else {
		res.redirect("/");
	}
});

app.get('/user/remove/:id', requiresLogin, function(req, res, next) {
	var user = req.session.user;
	if(user.role == 1) {
		var uid = req.params.id;
		var auid = getAllUserPositionBy(uid);
		allUsers.splice(auid,1);
		if(inOnlineUser(uid)) {
			auid = getUserOnlinPositionBy(uid);
			onlineUsers.splice(auid,1);
		}
		removeUser(uid);
		res.redirect("/users");
	} else {
		res.redirect("/");
	}
});

app.get('/edit/:id', requiresLogin, function(req, res, next) {
	var user = req.session.user;
	if(user.role == 1) {
		var uid = req.params.id;
		var auid = getAllUserPositionBy(uid);
		res.status(200).render("editar", {
			user: allUsers[auid]
		});
	} else {
		res.redirect("/");
	}
});

app.post('/save/:id', requiresLogin, function(req, res, next) {
	var uid = req.params.id;
	var auid = getAllUserPositionBy(uid);
	axios.post(api+'/user/'+uid+'/update', qs.stringify({
		name: req.body.name,
		lastname: req.body.lastname,
		email: req.body.email,
		password: req.body.password,
		profile: req.body.profile,
		role: req.body.role
	})).then(function(response) {
		if(response.status == 200) {
			getAllUsers(true);
			res.redirect("/users");
			if(response.data.code == 200) {
				res.redirect("/users");
			} else {
				res.render('editar', {
					user: allUsers[auid],
					error: response.data.message
				});
			}
		} else {
			res.render('editar', {
				user: allUsers[auid],
				error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
			});
		}
	}).catch(function(error) {
		res.render('editar', {
			user: allUsers[auid],
			error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
		});
	});
});

app.get(['/login'], function(req, res, next) {
	res.status(200).render('login');
});

app.post('/login', function(req, res, next) {
	if(req.body.action === "register") {
		if(req.body.name && req.body.lastname && req.body.password && req.body.email) {
			axios.post(api+'/users/create', qs.stringify({
				name: req.body.name,
				lastname: req.body.lastname,
				email: req.body.email,
				password: req.body.password,
				profile: generateProfileImage(),
				role: 0
			})).then(function(response) {
				if(response.status == 200) {
					if(response.data.code == 200) {
						res.render('login', {
							message: "Tu usuario ha sido registrado con exito. Ya puedes iniciar sesión.",
							email: req.body.email
						});
					} else {
						res.render('login', {
							error: response.data.message
						});
					}
				} else {
					res.render('login', {
						error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
					});
				}
			}).catch(function(error) {
				res.render('login', {
					error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
				});
			});
		} else {
			res.render('login', {error: "Todos los campos son requeridos!"});
		}
	} else {
		if(!(req.session.id in sessions)) {
			if(req.body.email && req.body.password) {
				axios.get(api+'/auth/check', {
					params: {
						email: req.body.email,
						password: req.body.password
					},
					paramsSerializer: function(params) {
						return qs.stringify(params)
					}
				}).then(function(response) {
					if(response.status == 200) {
						if(response.data.code == 4) {
							var user = response.data.data;
							req.session.user = user;
							onlineUsers.push(user);
							sessions[req.session.id] = user;
							io.sockets.emit('reload users', onlineUsers);
							res.redirect("/");
						} else {
							res.render('login', {
								error: response.data.message,
								email: req.body.email
							});
						}
					} else {
						console.log(response);
						res.render('login', {
							error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
						});
					}
				}).catch(function(error) {
					console.log(error);
					res.render('login', {
						error: "Ha ocurrido un error algo extraño, por favor intentalo de nuevo."
					});
				});
			}
		} else {
			res.render('login', {
				error: "Ya has iniciado sesión!!! :O"
			});
		}
	}
});

app.get(['/logout'], function(req, res, next) {
	delete sessions[req.session.id];
	onlineUsers.splice(getUserOnlinPositionBy(req.session.user.id),1);
	req.session.user = false;
	res.status(200).render('login');
});

io.on('connection', function(socket) {
	console.log("Nueva coneccion a messenger.io");

	if(socket.handshake.session.id in sessions) {
		if(!inOnlineUser(socket.handshake.session.user.id)) {
			onlineUsers.push(socket.handshake.session.user);
			io.sockets.emit('reload users', onlineUsers);
		}
		console.log(socket.handshake.session.user.name + " ha entrado al chat.");
	}

	socket.emit('messages', messages);
	socket.emit('reload users', onlineUsers);
	if(socket.handshake.session) {
		socket.emit('current-user', sessions[socket.handshake.session.id]);
	}
	socket.emit('get all users', allUsers);

	socket.on('send message', function(data) {
		var rsmessage = {
			message: data.message,
			user_id: data.user.id,
			trash: 0
		};

		var mid = messages.length > 0 ? parseInt(messages[messages.length-1].id) + 1 : 0;

		var lcmessage = {
			id: mid,
			message: data.message,
			user: [data.user],
			trash: 0
		};
		messages.push(lcmessage);
		io.sockets.emit('messages', messages);

		axios.post(api+'/messages/create', 
		qs.stringify(rsmessage)).then(function(response) {
			if(response.status == 200) {
				if(response.data.code == 200) {
					reloadMessages(true);
				} else {
					console.log(response.data);
				}
			} else {
				console.log(response.data);
			}
		}).catch(function(error) {
			console.log(error);
		});
	});

	socket.on('disconnect', function() {
		if(socket.handshake.session.id in sessions) {
			onlineUsers.splice(getUserOnlinPositionBy(sessions[socket.handshake.session.id].id),1);
			console.log(sessions[socket.handshake.session.id].name + " ha salido del chat.");
			io.sockets.emit('reload users', onlineUsers);
		}
	});
});

server.listen(8080, function() {
	console.log("Servidor corriendo en messenger.io");
});