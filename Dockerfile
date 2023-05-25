FROM amazonlinux:2

ENV WORK_DIR=/home/treble
ENV NODE_VERSION=16.0.0
ENV NVM_DIR=/root/.nvm
ENV PATH="${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/:${PATH}"

COPY package.json "$WORK_DIR/"
COPY tsconfig.json "$WORK_DIR/"
COPY src "$WORK_DIR/src/"
RUN mkdir "$WORK_DIR/docker" "$WORK_DIR/docker/dynamodb" "$WORK_DIR/docker/pki"

WORKDIR /home/treble

RUN yum update -y
RUN yum install wget tar gzip openssl -y
RUN wget -O- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
RUN node --version
RUN npm install

CMD ["npm", "run", "start"]