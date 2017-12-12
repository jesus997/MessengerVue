var socket = io.connect();

var chatbox = new Vue({
	delimiters: ['${', '}'],
	el: '#app',
	data: {
		users: [],
		current: {}
	},
	methods: {
	},
	computed: {
	}
});

socket.on('get all users', function(data) {
	chatbox.users = data;
});

socket.on('current-user', function(data) {
	chatbox.current = data;
});

window.onbeforeunload = function(e) {
  socket.disconnect();
};