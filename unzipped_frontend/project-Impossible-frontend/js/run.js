const runForm = document.getElementById('runForm');
const runList = document.getElementById('runList');

runForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const runnerName = document.getElementById('runnerName').value.trim();
  const distance = document.getElementById('distance').value;

  if (!runnerName || !distance) {
    return;
  }

  const listItem = document.createElement('li');
  listItem.className = 'rounded-box border border-base-300 bg-base-200 px-3 py-2';
  listItem.textContent = `${runnerName} ran ${distance} km`;

  runList.prepend(listItem);
  runForm.reset();
});
