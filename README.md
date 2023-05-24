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

5. Run the /scripts/ca.sh script in the /server folder to create CA cert/key

6. Upload your push cert/key pair (let me know if you don't have these)

```
cat PushCertificatePrivateKey.key PushCertificate.pem | curl -X "POST" -T - https://your-url/api/pushcert
```

7. Enroll a device - download and install an enrollment profile at /enroll

   _Note the enrollment ID logged in the console after enrollment_

8. Send a push notification to the device - /api/push/:enrollment_id

TODO: API handlers and lots of testing!
