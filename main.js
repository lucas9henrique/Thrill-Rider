import * as THREE from 'three';
import { KeyDisplay } from './utils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

Ammo().then(main);

function main() {

    let physicsWorld, scene, camera, renderer, rigidBodies = [], tmpTrans, clock;

    {
        const canvas = document.querySelector('#c');
        const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
        renderer.shadowMap.enabled = true;

        const larguraDoMapa = 200; // Defina a largura do mapa
        const comprimentoDoMapa = 200; // Defina o comprimento do mapa

        const fov = 60;
        const aspect = 2;
        const near = 0.1;
        const far = 200;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.shadowMap = true;
        camera.position.set(0, 2, 10);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('Skyblue')
        let bike;
        const rotationSpeed = 0.02; // Ajuste a velocidade de rotação conforme necessário
        let angle = 0;
        let isRotating = false;

        function setupPhysicsWorld() {
            let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
                dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
                overlappingPairCache = new Ammo.btDbvtBroadphase(),
                solver = new Ammo.btSequentialImpulseConstraintSolver();

            physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
        }


        setupPhysicsWorld();

        // CRIA O CHÃO
        function createGround() {

            const groundGeo = new THREE.PlaneGeometry(200, 200, 200, 200);

            let disMap = new THREE.TextureLoader().load("./textures/heightmap-01.png")

            disMap.wrapS = disMap.wrapT = THREE.RepeatWrapping;
            disMap.repeat.set(1, 1);

            const groundTexture = new THREE.TextureLoader().load("./textures/Grass_005_BaseColor.jpg");
            groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
            groundTexture.repeat.set(10, 10); // Ajuste a repetição conforme necessário



            const groundMat = new THREE.MeshStandardMaterial({
                map: groundTexture, // Aplique a textura ao material
                displacementMap: disMap,
                displacementScale: 12,
            });

            const mesh = new THREE.Mesh(groundGeo, groundMat);
            mesh.traverse((child) => {
                if (child.material) {
                    child.material.metalness = 0;
                }
                if (child.isMesh) {
                    child.receiveShadow = true;
                }
            });
            mesh.receiveShadow = true;
            scene.add(mesh);
            mesh.rotation.x = Math.PI * -.5;
            mesh.position.y = -0.5;
        }

        createGround();

        // Função para carregar o objeto com GLTFLoader
        function loadBike() {
            return new Promise((resolve, reject) => {
                const loader2 = new GLTFLoader();
                loader2.load('textures/ktm_450_exc.glb', (gltf) => {
                    bike = gltf.scene;
                    bike.position.set(0, 0.31, 0);
                    scene.add(bike);
                    resolve(bike); // Resolvendo a Promise com o objeto bike
                }, undefined, (error) => {
                    reject(error); // Rejeitando a Promise em caso de erro
                });
            });
        }


        function getHeightAtPosition(x, z) {
            const groundGeo = new THREE.PlaneGeometry(200, 200, 200, 200); // Usando 200 segmentos em cada direção

            // Normaliza as coordenadas X e Z entre -0.5 e 0.5 (pois a geometria do terreno é centrada no (0, 0))
            const normalizedX = (x / 200) - 0.5;
            const normalizedZ = (z / 200) - 0.5;

            // Calcula a posição do vértice correspondente às coordenadas X e Z
            const column = Math.floor((normalizedX + 0.5) * 200);
            const row = Math.floor((normalizedZ + 0.5) * 200);
            const vertexIndex = row * (200 + 1) + column;

            // Obtém o buffer de posição da geometria
            const positionAttribute = groundGeo.getAttribute("position");

            // Obtém a altura do terreno nesse vértice
            const alturaDoTerreno = positionAttribute.getY(vertexIndex);

            return alturaDoTerreno;
        }


        //Orbit Controls
        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true
        orbitControls.minDistance = 5
        orbitControls.maxDistance = 15
        orbitControls.enablePan = false
        orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
        orbitControls.update();


        // CONTROL KEYS
        const keysPressed = {};
        const keyDisplayQueue = new KeyDisplay();

        function updateObjectPosition() {
            const speed = 0.5; // Velocidade de movimento do objeto

            // Verifica tecla W (para frente)
            if (keysPressed['w']) {
                bike.position.z += speed;  // Move o objeto para trás
            }

            // Verifica tecla A (para a esquerda)
            if (keysPressed['a']) {
                bike.position.x += speed;
                //angle += rotationSpeed;
                //bike.rotation.y = THREE.MathUtils.clamp(angle, -Math.PI, Math.PI);

            }

            // Verifica tecla S (para trás)
            if (keysPressed['s']) {
                bike.position.z -= speed; // Move o objeto para frente
            }

            // Verifica tecla D (para a direita)
            if (keysPressed['d']) {
                bike.position.x -= speed;
                //angle -= rotationSpeed;
                //bike.rotation.y = THREE.MathUtils.clamp(angle, -Math.PI, Math.PI);

            }

            // Verifica tecla Space pra cima 
            if (keysPressed[' ']) {
                bike.position.y += speed; // Move o objeto para a cima
            }

            // Verifica tecla Shift pra baixo 
            if (keysPressed['shift']) {
                bike.position.y -= speed; // Move o objeto para a baixo
            }
        }
        document.addEventListener('keydown', (event) => {
            keyDisplayQueue.down(event.key);
            keysPressed[event.key.toLowerCase()] = true;
        },);

        document.addEventListener('keyup', (event) => {
            keyDisplayQueue.up(event.key);
            keysPressed[event.key.toLowerCase()] = false;
        },);

        const clock = new THREE.Clock();

        // Função para carregar e gerar um objeto no mapa
        function loadAndGenerateObject(objectPath, scale) {
            const loader3 = new GLTFLoader();
            loader3.load(objectPath, (gltf) => {
                const object = gltf.scene;
                object.traverse((child) => {
                    // if (child.isMesh) child.material = angryTexture;
                    if (child.material) {
                        child.material.metalness = 0;
                    }
                    if (child.isMesh) {
                        child.castShadow = true;
                    }
                });

                // Ajusta a escala do objeto
                object.scale.set(scale, scale, scale);

                // Gera a posição aleatória do objeto dentro do mapa
                const randomX = Math.random() * (larguraDoMapa - 20); // Largura do mapa
                const randomZ = Math.random() * (comprimentoDoMapa - 20); // Comprimento do mapa
                const position = new THREE.Vector3(randomX - 100, 0, randomZ - 100);
                object.position.copy(position);
                console.log(getHeightAtPosition(randomX, randomZ))

                // Gera a orientação aleatória do objeto
                const randomRotation = Math.random() * Math.PI * 2; // Ângulo aleatório em radianos
                object.rotation.y = randomRotation;

                // Adiciona o objeto à cena
                scene.add(object);
                let transform = new Ammo.btTransform();
                transform.setIdentity();

                transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
                transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
                let motionState = new Ammo.btDefaultMotionState(transform);

                let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
                colShape.setMargin(0.05);

                let localInertia = new Ammo.btVector3(0, 0, 0);
                colShape.calculateLocalInertia(mass, localInertia);

                let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
                let body = new Ammo.btRigidBody(rbInfo);

                physicsWorld.addRigidBody(body);
            }, undefined, (error) => {
                console.error(error);
            });
        }

        // Função para gerar múltiplos objetos aleatoriamente no mapa
        function generateObjects(objectPath, numObjects, scale) {
            for (let i = 0; i < numObjects; i++) {
                loadAndGenerateObject(objectPath, scale);
            }
        }

        // Chamada para gerar múltiplos objetos (pedras, por exemplo)
        const stonePath = '/textures/stone_03.glb'; // Caminho para o arquivo GLB da pedra
        const numStones = 30; // Número de pedras a serem geradas
        const scaleStone = 8; // Fator de escala (2 para dobrar o tamanho)
        generateObjects(stonePath, numStones, scaleStone);

        // Chamada para gerar múltiplos objetos (árvores, por exemplo)
        const treePath = '/textures/oak_trees.glb'; // Caminho para o arquivo GLB da árvore
        const numTrees = 15; // Número de árvores a serem geradas
        const scaleTree = 8; // Fato
        generateObjects(treePath, numTrees, scaleTree);


        const cameraDistance = -0.4; // Distância da câmera em relação ao objeto
        const cameraHeight = 1.3; // Altura da câmera em relação ao objeto
        const cameraDirection = new THREE.Vector3(0, 0.8, 1);


        // Função de atualização da câmera
        function updateCamera() {
            if (!bike) {
                console.log("A bike ainda não foi carregada, trate esse caso");
                return;
            }
            console.log(bike.position);
            // Atualiza o vetor de direção da bicicleta
            const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance);
            // Define a posição da câmera para estar atrás da bicicleta na direção do vetor bikeDirection
            const cameraPosition = bike.position.clone().add(cameraOffset);
            camera.position.copy(cameraPosition);
            const lookAtPosition = bike.position.clone().add(cameraDirection); // Usando o vetor cameraDirection
            camera.lookAt(lookAtPosition);
        }
        function updateRotate() {

            const rotationOffset = cameraDirection; // Vetor de deslocamento para trás da bike
            rotationOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), bike.rotation.y); // Rotaciona o vetor de acordo com a rotação da bike

            const lookAtPosition = bike.position.clone().add(rotationOffset);

            camera.lookAt(lookAtPosition);

        }

        // Carrega a bike usando a Promise
        loadBike().then(() => {
            // Chama a função para atualizar a câmera após a bike ser carregada
            updateCamera();
        }).catch((error) => {
            console.error(error);
        });

        // Adicione os eventos para detectar a tecla de rotação
        document.addEventListener('keydown', (event) => {
            if (event.key === 'a' || 'd') {
                isRotating = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.key === 'a' || 'd') {
                isRotating = false;
            }
        });


        // Crie a luz direcional correspondente ao sol
        const color = new THREE.Color(0xffffff);
        const intensity = 1; // Ajuste a intensidade 
        const light = new THREE.PointLight(color, intensity);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024; // Tamanho horizontal do shadow map
        light.shadow.mapSize.height = 1024; // Tamanho vertical do shadow map
        light.position.set(200, 100, 0); // Posição da luz 
        scene.add(light);

        // Helper para visualizar a direção da luz 
        const helper = new THREE.PointLight(light);
        scene.add(helper);

        function resizeRendererToDisplaySize(renderer) {
            const canvas = renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                renderer.setSize(width, height, false);
                return needResize;
            }
        }

        function updatePhysics(deltaTime) {
            physicsWorld.stepSimulation(deltaTime, 10);

            for (let i = 0; i < rigidBodies.length; i++) {
                let objThree = rigidBodies[i];
                let objAmmo = objThree.userData.physicsBody;
                let ms = objAmmo.getMotionState();
                if (ms) {
                    ms.getWorldTransform(tmpTrans);
                    let p = tmpTrans.getOrigin();
                    let q = tmpTrans.getRotation();
                    objThree.position.set(p.x(), p.y(), p.z());
                    objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
                }
            }
        }

        function render() {
            let deltaTime = clock.getDelta();
            if (resizeRendererToDisplaySize(renderer)) {
                const canvas = renderer.domElement;
                camera.aspect = canvas.clientWidth / canvas.ClienteHeight;
                camera.uptadeProjectionMatrix;
            }
            updateObjectPosition();
            if (isRotating) {
                updateRotate();
            }
            updateCamera();
            updatePhysics(deltaTime);
            renderer.render(scene, camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }
}
main();