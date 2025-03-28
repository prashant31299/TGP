// Contacts management functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load contacts when the contacts section is shown
    document.querySelector('nav a[href="#contacts"]').addEventListener('click', loadContacts);
    
    // Add contact form submission
    const addContactForm = document.querySelector('.add-contact-form');
    const addContactButton = document.getElementById('add-contact');
    
    addContactButton.addEventListener('click', function() {
        const nameInput = document.getElementById('contact-name');
        const phoneInput = document.getElementById('contact-phone');
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (name === '' || phone === '') {
            alert('Please enter both name and phone number');
            return;
        }
        
        // Add contact to database
        addEmergencyContact(name, phone);
        
        // Clear form
        nameInput.value = '';
        phoneInput.value = '';
        
        // Reload contacts list
        loadContacts();
    });
    
    // Initial load of contacts
    loadContacts();
});

// Function to load contacts from database
function loadContacts() {
    const contactsList = document.getElementById('contacts-list');
    const contacts = getEmergencyContacts();
    
    // Clear current list
    contactsList.innerHTML = '';
    
    if (contacts.length === 0) {
        contactsList.innerHTML = '<p>No emergency contacts added yet. Add your first contact below.</p>';
        return;
    }
    
    // Add each contact to the list
    contacts.forEach((contact, index) => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.innerHTML = `
            <div>
                <h3>${contact.name}</h3>
                <p>${contact.phone}</p>
            </div>
            <div>
                <button class="delete-contact" data-index="${index}">Delete</button>
            </div>
        `;
        contactsList.appendChild(contactItem);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-contact').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteEmergencyContact(index);
            loadContacts();
        });
    });
}

// Function to add emergency contact
function addEmergencyContact(name, phone) {
    let contacts = getEmergencyContacts();
    contacts.push({ name, phone });
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
}

// Function to get all emergency contacts
function getEmergencyContacts() {
    const contacts = localStorage.getItem('emergencyContacts');
    return contacts ? JSON.parse(contacts) : [];
}

// Function to delete emergency contact
function deleteEmergencyContact(index) {
    let contacts = getEmergencyContacts();
    contacts.splice(index, 1);
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
}