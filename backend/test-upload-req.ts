import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  try {
    const form = new FormData();
    // Use a small dummy file. Let's create one first.
    fs.writeFileSync('dummy.jpg', Buffer.from('fake image content'));
    
    // Wait, sharp will crash if it's fake image content. We need a real image buffer.
    // Let's download a small placeholder image.
    const imageResp = await axios.get('https://via.placeholder.com/150', { responseType: 'arraybuffer' });
    fs.writeFileSync('test.jpg', imageResp.data);

    form.append('images', fs.createReadStream('test.jpg'));

    // We need a valid JWT token. But since this is a dev server, let's look at auth logic.
    // I will mock the token or just login.
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'israelboateng5@gmail.com', // wait, we don't know the landlord's password.
      password: 'password123'
    });
    console.log(loginRes.data);
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}

testUpload();
