var socket = io.connect();

function scrollToBottom(anim = true) {
	if(anim) {
		$("#chatzone").stop().animate({ scrollTop: $("#chatzone")[0].scrollHeight}, 1000);
	} else {
		$("#chatzone").scrollTop = $("#chatzone")[0].scrollHeight;
	}
}

Vue.component('users-list', {
	props: ['user'],
	template: '<li class="list-group-item">\
					<img :src="user.profile" :alt="user.name" width="32" height="32" />\
					{{user.name}} {{ user.lastname }}</li>'
});

Vue.component('messages-list', {
	props: ['data', 'currentuser'],
	template: '<li :class="(data.user[0].elogic == 1) ? \'user-removed\' : \'\'">\
					<div :class="(currentuser.id == data.user[0].id) ? \'message-box active\' : \'message-box\'">\
						<div class="user-image">\
							<img :src="data.user[0].profile" :alt="data.user[0].name" />\
						</div>\
						<div class="message-content">\
							<b>{{ data.user[0].name }} {{ data.user[0].lastname }}</b>\
							<p>{{ data.message }}</p>\
						</div>\
					</div>\
				</li>',
	mounted: function () {
		scrollToBottom();
	}
});

var chatbox = new Vue({
	delimiters: ['${', '}'],
	el: '#app',
	data: {
		users: [],
		raw: '',
		messages: [],
		current: {},
		search: ''
	},
	methods: {
		sendMessage(event) {
			event.preventDefault();
			if(this.raw) {
				socket.emit('send message', {message: this.raw, user: this.current});
				this.raw = "";
			}
		}
	},
	computed: {
		filteredMessages() {
			return this.messages.filter(message => {
				return message.message.toLowerCase().indexOf(this.search.toLowerCase()) > -1
			});
		}
	}
});

socket.on('messages', function(data) {
	chatbox.messages = data;
});

socket.on('reload users', function(data) {
	chatbox.users = data;
});

socket.on('current-user', function(data) {
	chatbox.current = data;
});

window.onbeforeunload = function(e) {
  socket.disconnect();
};