![Build Status](https://gitlab.com/mlreef/frontend/badges/master/build.svg)

MLReef Frontend
====================
Please read the [Contribution Guidelines](CONTRIBUTE.md) carefully

### Module Structure
* **/**:   the root module contains docker and infrastructure sources
* **web**: the npm based react frontend


Getting Started
--------------------

### 1. Setup your developer environment
 1. Install latest Docker
 2. Login to our private docker registry with your gitlab credentials by executing `docker login registry.gitlab.com`

### 2. Setup Gitlab (in docker) infrastructure
For running locally we are using _docker-compose_. The full docker compose file contains all services (inluding the frontend).


#### MacOs / Linux
For starting and setting up your local docker environment run: `bin/setup-local-environment.sh` and follow the instructions for setting up your local instance including gitlab runners

During setup, you **WILL** ecounter the following error message: `ERROR: Failed to load config stat /etc/gitlab-runner/config.toml: no such file or directory  builds=0` until the setup has completed successfully.

This is the gitlab runner complain about its missing configuration. As soon as the last step of the `bin/docker-compose-new.sh` script has been performed you will encounter no more errors.

The runner hot-reloads the config file ervery 5 sconds, so no restart is necessary.


#### Windows

For starting and setting up your local docker environment run: `bin/setup-local-environment.bat` and follow the instructions for setting up your local instance, but without gitlab runners.
gitlab runners are not working yet under windows.

For understanding:

* this injects the GITLAB_ADMIN_TOKEN into the gitlab-postgres database in a encrypted way.
  * **Do not change the gitlab salts afterwards**, as everything encrypted (all tokens and passwords) would then be lost.
* gitlab runners will be set up via browser


### Start Frontend Development
* Stop the frontend docker  `docker stop frontend`
* and start locally with "npm start"

For actually developing in the frontend, you might want to remove (or comment) the complete `frontend`
section from the `docker-compose.yml` file.

For further information on running locally, please refer to the web module's [README.md](web/README.md)



Styleguide
--------------------
Here is the XD file for the definitions of all elements: https://xd.adobe.com/spec/e23711b1-f385-4729-5034-632fbe73bb6b-9406/

**Color Pallette:**

<p>Deep dark (primary blue): #1D2B40</p>
<p>Almost white (base color, very light grey): #e5e5e5</p>
<p>Signal fire (red): #f5544d</p>
<p>Algae (green): #15B785</p>
<p>Sponge (yellow): #EABA44</p>
<p>Lagoon (light blue): #16ADCE</p>
<p>Less white (grey): #b2b2b2</p>

**UI Elements**
In this [list](uielements.md) you will all used standard UI elements. 



Infrastructure
--------------------

### Per-Branch Cloud Deployment
MLReef's infrastructure is deployed to the AWS cloud automatically. One separate fresh environment for every branch
(feature-branch or other) deployed freshly for every developer push.

Currently, the following steps are performed automatically during deployment.
1. Build docker image for the frontend NodeJS App
2. Provision a new ec2 instance with docker pre-installed
3. Docker's `.env` file is created which contains the URL of the new instance
4. The Frontend's `web/.env` file is updated which contains the URL of the new instance
5. Start the MLReef service stack - based on our `docker-compose.yml` - on the ec2 instance
   The service stack consists of postgres, redis, gitlab, gitlab runner, micro services, NodeJS Frontend
6. Configure the gitlab-runner-dispatcher
   (This has to be done after gitlab has successfully started)
   The Gitlab runner dispatcher boots new ec2 instances for running gitlab pipelines

After a branch is merged/deleted the Gitlab pipeline is used to delete the ec2 instance.


### Networking
All the services defined in the _docker-compose.yml_ run as separate containers inside the docker network. This means that they can talk to each other using local ULRS. The backend for example can access the local Gitlab instance **internally** via http://gitlab:80.

From the **outside** the adresses and ports are mapped a little bit differnetly. The Gitlab instance is reachable direclty at `http://ec-123-123-123-123..eu-central-1.compute.amazonaws.com:10080` (note the port number). Please look at the _docker-compose.yml_ for the correct port numbers of the ther services


### HTTP Reverse Proxy
The _docker-compose.yml_ features **nginx** as reverse proxy running on port 80. One reason for this setup is, so that
we can route API calls to the Backend, Gitlab and other services through the same _orgign_ and preven CORS errors.


### Instance Maintainance
To connect to a development instance you will need either the IP or hostname of the instance.
This can be found in the [Environments Section](https://gitlab.com/mlreef/frontend/-/environments) on gitlab.com

You will also need the most current `development.pem` which contains the private key to authenticate with the ec2 instance

To login to the an instance located at `ec2-123-123-123-123.eu-central-1.compute.amazonaws.com` use the following command.

```bash
ssh -i "development.pem" ubuntu@ec2-123-123-123-123.eu-central-1.compute.amazonaws.com

# to switch to the root user type:
sudo bash
```

### Docker Maintenance
To display all running containers
```bash
docker ps
docker ps -all
```

To look at the container's logs
```bash
docker logs $CONTAINER_NAME

# to follow the container log live:
docker logs $CONTAINER_NAME -f
```

Understanding Docker for development ENV
----------------------------------------
The systems relies on just one ENV variable which must be provided and must not have a default:

* ***GITLAB_ADMIN_TOKEN*** (secret and mandatory)
  * the Private Access Token (PTA) to access the gitlab container as gitlab admin
  * must not be changed after initialisation (without resetting gitlab)
  * must be provided to backend and gitlab
  * must not be used in the frontend

### Prelude

The scripts setup-loca-environment.sh/bat shall be helpful to setup your development environment. Unfortunately, docker-compose is quite complex and behaves differently on each machine.

Local individual issues can occur:

* different set env vars
* strange startup time of containers, i.e. gitlab container
* race conditions
* installed docker version
* cygwin installed in windows

Therefore, it is necessary that you understand the behavior and steps of the script, because you ought to do them manually!

### setup-local-environment.bat

Docker stops and kills containers and networks of the docker-compose.yml, but volumes are kept persistently!

```bash
docker-compose down
```

Ask docker to remove containers, networks and images, but again, persistant volumes are kept:

```bash
docker-compose rm -f -v -s
```

You have to explicitly remove a named volume. The script will remove your local persisted state of mlreef-frontend, it is clean now:

```bash
docker volume rm frontend_sock
docker volume rm frontend_gitlab-data
docker volume rm frontend_gitlab-runner-config
docker volume rm frontend_gitlab-runner-data
docker volume rm frontend_mlreefsql-data
docker volume rm frontend_postgresql-data
```

Start a docker-compose with --detach to still be able to use your terminal, when all those docker containers start:

```bash
docker-compose up --detach
# or
docker-compose up -d
```

Important: containers will start in the order of dependencies, but they might not wait for each other.

You can also (re)start a single container, all if dependies have to be running or they will be (re)started aswell:

```bash
docker-compose up --detach single_container
```

Similar you can stop just one container. Dependend containers would then possible die or be stopped by docker! You have to watch your stack and restart them excplitcly, in the right order, and also with their individual waiting time:

```bash
docker-compose stop backend
```

When a container is running, you can advise docker to execute a command INSIDE of that container. Therefore, all the commands and scripts have to exist in the container or image already, there is no way of calling a non-existent script. The script would not stop the container after execution:

```bash
# executes setup-gitlab.sh which lies on the $PATH in gitlab-postgres container
docker exec -it gitlab-postgres setup-gitlab.sh
```

### Debugging docker, gitlab and backend

Those docker containers have different startup and waiting times, which can vary extremely on different machines!

* gitlab:
  * first start and setup: 2 to 5 minutes!
  * waits for the postgres database for ~20 seconds
  * further starts: ~20-30 seconds to restart with the persistend volume
* backend:
  * needs database and redis directly when starting
  * needs ~5-15 seconds to start Spring Boot
  * checks for the gitlab connection at ~ 0:15
  * cleans and inserts the initial test data at ~ 0:15
* postgres: ~5 seconds
* redis: ~2 seconds

The backend starts and checks for an available gitlab. If it cannot work due to persistant misconfiguration, a crash will inform you about bad credentials (GITLAB_ADMIN_TOKEN) or a invalid GITLAB_ROOT_URL. In case of temporary communication failures, the backend assumes the configuration would be working.

You can ask the backend how it feels:

Test if backend is reachable

```bash
curl "http://localhost:8080/api/v1/info/status" -i -X GET -H "Content-Type: application/json" -H "Accept: application/json"
```

Print out information about gitlab connection:

```bash
curl "http://localhost:8080/api/v1/info/health" -i -X GET -H "Content-Type: application/json" -H "Accept: application/json"
```

***Important***:

* If there is a invasive SQL excution (CREATE, DROP, INSERT, TRUNCATE) during the setup of gitlab, gitlab dies in pain!
  * do not run those SQL scripts when gitlab is migrating
  * watch out for the state of gitlab
  * restart and look in logs if it dies constantly
* backend constraints
  * the backend needs a working gitlab to operate!
  * Therefore, the backend will throw errors
  * if it *cannot work NEVER* (with the current config), so it **DIE**s and you have to fix the config
  * if the gitlab is not working or not available just *AT THE MOMENT*, then the backend *cannot work NOW*, but it will not die.
  * If you see some errors and backend lives: Wait for gitlab. restart those containers conciously and fix timing issues (502, 500, 400 http errors)
  * If you see some errors and backend dies with FATAL:
    * Gitlab is broken, fix those admin tokens
    * Gitlab root url is wrong, fix it
    * You will see a "403" in those cases.

### DataPopulator creates test data

This step is actually not needed for working, but useful as it creates a demo user and some repositories.

* This will just work, if gitlab is available during boot ;)
* data population is started when you run backend in "dev" or "docker" environment
* this will be changed and refactored soon; it was just meant to have a demo user now

### Explanation of ENV variables

As we are in development for pre-alpha: Set GITLAB_ADMIN_TOKEN is sufficent.

More ENV vars can be used for local adaption, development and debugging:

* GITLAB_ROOT_URL (optional)
  * may default to "http://gitlab:80" but could be provided anyway in the backend
* GITLAB_SECRETS_DB_KEY_BASE (should be: secret, mandatory)
  * use the same salt for gitlab and for gitlab-postgres
  * salt for encryption: **must not be changed after initialisation!**
  * currently "long-and-random-alphanumeric-string" is used for dev env
* SPRING_PROFILES_ACTIVE (optional defined)
  * default "docker"
  * provides useful defaults for GITLAB_ROOT_URL and logging output 
  * provide "docker" for docker development env: less logging, recreates the database
  * provide "dev" for development env: much logging, recreates the database
  * provide "test" for testing: uses testcontainers instead of docker services for tests
  * provide "prod" for testing: less logging  

TODO: Refactor this in the frontend:

* BACKEND_INSTANCE_URL (optional)
  * may default to "http://localhost:20080" but must be provided for the frontend connection
* GITLAB_ROOT_URL (optional)
  * may default to "http://gitlab:80" but should be provided anyway in the backend

```bash
docker ps

# you may need to restart backend or gitlab after the setup-gitlab
docker-compose up -d backend

# restart the frontend
docker-compose up -d frontend  nginx-proxy
```

#### Attention: 2nd Proxy for local dev environment

There is a middleware proxy in setupProxy.js to proxy during development (does not need nginx-proxy)

This is meant as a helper for frontend developers and a work-in-progress.

To stop the nginx-proxy run this:

```bash
cd frontend/
docker stop nginx-proxy
cd web/
npm start
```

#### Register additional test users

As registration is not implemented in the frontend yet, a user must be registered via backend REST-service.
This requirement will vanish, as we are working on a better way to populate with test data.

This is not necessary now, as the backend creates a user when started in "dev" or "docker" spring environment

```bash
curl 'http://localhost:8080/api/v1/auth/register' -i -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d '{
  "username" : "mlreef",
  "email" : "mlreef-demo@example.org",
  "password" : "password",
  "name" : "name"
}'
```
