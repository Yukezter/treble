# treble

1. Build the treble server image

```
docker-compose build treble
```

2. Start the treble container (this will run the DynamoDB container too)

```
docker-compose up treble
```

3. Run the Ngrok container

```
docker-compose up ngrok
```

4. Find your Ngrok url in the web interface: http://localhost:4040

5. Upload push cert/key pair

```
cat PushCertificatePrivateKey.key PushCertificate.pem | curl -X "POST" -T - https://ngrok-url/api/pushcert
```

6. Enroll a device - download and install an enrollment profile at /enroll

   _Note the enrollment ID logged in the console after enrollment_

7. Send a push notification to the device - /api/push/:enrollment_id
