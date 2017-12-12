var socket = io.connect();
(function($) {
	$('.toggle').click(function(){
		$('#tooltip').html( $('#tooltip').html() === "Registrarse" ? 'Iniciar sesión' : 'Registrarse' );
		$(this).children('i').toggleClass('fa-pencil');
		$('.form').animate({
			height: "toggle",
			'padding-top': 'toggle',
			'padding-bottom': 'toggle',
			opacity: "toggle"
		}, "slow");
	});
})(jQuery);