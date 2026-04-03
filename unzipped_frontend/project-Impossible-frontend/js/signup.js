const signupForm = document.getElementById('signupForm');
const signupMessage = document.getElementById('signupMessage');

signupForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName || !username || !email || !password || !confirmPassword) {
    showSignupMessage('Please fill in all fields.', 'alert-error');
    return;
  }

  if (password !== confirmPassword) {
    showSignupMessage('Password and confirm password do not match.', 'alert-error');
    return;
  }

  showSignupMessage('Demo account created successfully.', 'alert-success');
  signupForm.reset();
});

function showSignupMessage(text, alertClass) {
  signupMessage.className = `alert mt-3 ${alertClass}`;
  signupMessage.textContent = text;
}
