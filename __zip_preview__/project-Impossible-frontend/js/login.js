const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const identityValue = document.getElementById('identity').value.trim();
  const passwordValue = document.getElementById('password').value.trim();

  if (!identityValue || !passwordValue) {
    showLoginMessage('Please fill in all fields.', 'alert-error');
    return;
  }

  showLoginMessage('Demo login successful.', 'alert-success');
  loginForm.reset();
});

function showLoginMessage(text, alertClass) {
  loginMessage.className = `alert mt-3 ${alertClass}`;
  loginMessage.textContent = text;
}
