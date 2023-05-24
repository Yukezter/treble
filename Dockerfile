FROM amazonlinux:2

ENV NODE_VERSION=16.0.0

COPY package.json /app/
COPY tsconfig.json /app/
COPY src /app/

WORKDIR /app

# RUN yum update
RUN yum install wget tar gzip openssl -y
RUN wget -O- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm install

CMD ["npm", "run", "start"]