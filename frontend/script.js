// Function to handle form submission in index.html
async function submitForm(event) {
    event.preventDefault();

    const formData = new FormData(document.querySelector('form'));
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('http://localhost:8080/submit', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Submission failed');
        }

        const result = await response.json();
        alert(result.message);
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Function to handle user search in search.html
async function searchUser(event) {
    event.preventDefault();

    const searchValue = document.getElementById('search').value;

    try {
        const response = await fetch(`http://localhost:8080/search?query=${searchValue}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'User not found');
        }

        const result = await response.json();
        displayUserDetails(result);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('user-details').innerHTML = `<p>${error.message}</p>`;
    }
}

function displayUserDetails(user) {
    const userDetailsDiv = document.getElementById('user-details');
    userDetailsDiv.innerHTML = `
        <p>Name: ${user.name}</p>
        <p>Age: ${user.age}</p>
        <p>Mobile: ${user.mobile}</p>
        <p>Nationality: ${user.nationality}</p>
        <p>Language: ${user.language}</p>
        <p>PIN: ${user.pin}</p>
    `;
}
