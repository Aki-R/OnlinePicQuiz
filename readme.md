## To build docker image
`docker build . -t node-bokashi-quiz-app`

## To run docker container
`docker run -p 49160:8080 -d node-bokashi-quiz-app --name quiz_app`

## To stop docker container
`docker stop quiz_app`