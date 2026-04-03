document.addEventListener('DOMContentLoaded', function () {
	const menuButtons = document.querySelectorAll('[data-menu-toggle]');

	menuButtons.forEach(function (button) {
		const targetId = button.getAttribute('data-menu-target');
		const menu = targetId ? document.getElementById(targetId) : null;

		if (!menu) {
			return;
		}

		button.addEventListener('click', function () {
			const isHidden = menu.classList.contains('hidden');
			menu.classList.toggle('hidden');
			button.setAttribute('aria-expanded', String(isHidden));
		});

		document.addEventListener('click', function (event) {
			if (menu.classList.contains('hidden')) {
				return;
			}

			const clickedInsideMenu = menu.contains(event.target);
			const clickedButton = button.contains(event.target);

			if (!clickedInsideMenu && !clickedButton) {
				menu.classList.add('hidden');
				button.setAttribute('aria-expanded', 'false');
			}
		});

		window.addEventListener('resize', function () {
			if (window.innerWidth >= 768) {
				menu.classList.add('hidden');
				button.setAttribute('aria-expanded', 'false');
			}
		});
	});
});
