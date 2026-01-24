// contentScript.js

// Add an empty export statement to make it a module
export {};

// Create a function to add the shortcut to the webpage
function addShortcut() {
    // Create a new shortcut element
    const shortcut = document.createElement('div');
    shortcut.classList.add('my-custom-shortcut');
    
    // Customize the shortcut appearance
    shortcut.style.position = 'fixed';
    shortcut.style.bottom = '20px';
    shortcut.style.right = '20px';
    shortcut.style.cursor = 'pointer';
    // Add your icon or text here
    shortcut.textContent = 'dr.dk';
    shortcut.style.padding = '10px';
    shortcut.style.backgroundColor = 'blue';
    shortcut.style.color = 'white';
    shortcut.style.borderRadius = '5px';
    
    // Handle click event
    shortcut.addEventListener('click', () => {
        // Navigate to dr.dk when the shortcut is clicked
        window.location.href = 'https://www.dr.dk/';
    });
    
    // Append the shortcut to the document body
    document.body.appendChild(shortcut);
}

// Call the function to add the shortcut when the content script is injected
addShortcut();
