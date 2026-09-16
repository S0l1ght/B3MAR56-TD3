import * as THREE from "three";

import { ARButton }
    from "three/addons/webxr/ARButton.js";

import { OrbitControls }
    from "three/addons/Controls/OrbitControls.js";

import { GLTFLoader }
    from "three/addons/utils/GLTFLoader.js";

import { RGBELoader }
    from "three/addons/Decor/RGBELoader.js";


// =====================================================
// VARIABLES
// =====================================================

let scene;
let camera;
let renderer;

let reticle;

let pmremGenerator;
let envmap;

let controls;

let current_object = null;
let current_url = "1";

let hitTestSource = null;
let hitTestSourceRequested = false;


// =====================================================
// INITIALISATION
// =====================================================

init();


// =====================================================
// INIT
// =====================================================

function init() {

    // -------------------------------------------------
    // SCENE
    // -------------------------------------------------

    scene = new THREE.Scene();


    // -------------------------------------------------
    // CAMERA
    // -------------------------------------------------

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    camera.position.set(
        0,
        1,
        3
    );


    // -------------------------------------------------
    // RENDERER
    // -------------------------------------------------

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        window.devicePixelRatio
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.xr.enabled = true;

    document
        .getElementById("container")
        .appendChild(
            renderer.domElement
        );


    // -------------------------------------------------
    // PMREM
    // -------------------------------------------------

    pmremGenerator =
        new THREE.PMREMGenerator(
            renderer
        );

    pmremGenerator.compileEquirectangularShader();


    // -------------------------------------------------
    // ORBIT CONTROLS
    // -------------------------------------------------

    controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );

    controls.addEventListener(
        "change",
        render
    );

    controls.minDistance = 2;
    controls.maxDistance = 10;

    controls.target.set(
        0,
        0,
        -0.2
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;


    // -------------------------------------------------
    // LUMIERES
    // -------------------------------------------------

    const directionalLight =
        new THREE.DirectionalLight(
            0xdddddd,
            1
        );

    directionalLight.position.set(
        0,
        0,
        1
    );

    directionalLight.normalize();

    scene.add(
        directionalLight
    );


    const ambientLight =
        new THREE.AmbientLight(
            0x222222
        );

    scene.add(
        ambientLight
    );


    // =================================================
    // RETICLE
    // =================================================

    const geometry =
        new THREE.RingGeometry(
            0.15,
            0.20,
            32
        );

    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial();


    reticle =
        new THREE.Mesh(
            geometry,
            material
        );


    // Très important :
    // la matrice sera contrôlée par le hit-test

    reticle.matrixAutoUpdate = false;

    reticle.visible = false;


    scene.add(
        reticle
    );


    // =================================================
    // AR BUTTON
    // =================================================

    const options = {

        requiredFeatures: [
            "hit-test"
        ]

    };


    const arButton =
        ARButton.createButton(
            renderer,
            options
        );


    // On lui donne l'id demandé par le TD

    arButton.id = "ARButton";


    document.body.appendChild(
        arButton
    );


    // =================================================
    // CLICK SUR START AR
    // =================================================

    $("#ARButton").click(
        function () {

            if (current_object) {

                current_object.visible =
                    false;

            }

        }
    );


    // =================================================
    // SESSION AR
    // =================================================

    renderer.xr.addEventListener(
        "sessionstart",
        function () {

            console.log(
                "Session AR démarrée"
            );


            hitTestSource = null;

            hitTestSourceRequested =
                false;


            reticle.visible =
                false;


            // Le modèle devient invisible
            // pendant la recherche de surface

            if (current_object) {

                current_object.visible =
                    false;

            }


            // Récupération de la session XR

            const session =
                renderer.xr.getSession();


            // -------------------------------------------------
            // SELECT
            // -------------------------------------------------

            session.addEventListener(
                "select",
                onSelect
            );

        }
    );


    // =================================================
    // REDIMENSIONNEMENT
    // =================================================

    window.addEventListener(
        "resize",
        onWindowResize
    );


    // =================================================
    // BOUCLE DE RENDU
    // =================================================

    renderer.setAnimationLoop(
        render
    );


    // =================================================
    // CHARGEMENT DU PREMIER MODELE
    // =================================================

    loadModel(
        current_url
    );
}


// =====================================================
// MENU DES MODELES
// =====================================================

$(".ar-object").click(
    function () {

        current_url =
            $(this).attr("id");


        console.log(
            "Modèle sélectionné : "
            + current_url
        );


        // On ne change pas de modèle
        // pendant une session AR

        if (
            !renderer.xr.isPresenting
        ) {

            if (current_object) {

                scene.remove(
                    current_object
                );

                current_object =
                    null;

            }


            loadModel(
                current_url
            );

        }

    }
);


// =====================================================
// CHARGEMENT DU MODELE
// =====================================================

function loadModel(model) {

    console.log(
        "Chargement de "
        + model
        + ".glb"
    );


    // =================================================
    // HDR
    // =================================================

    new RGBELoader()

        .setDataType(
            THREE.HalfFloatType
        )

        .setPath("")

        .load(

            "lakeside_sunrise_2k.hdr",

            function (texture) {

                console.log(
                    "HDR chargé"
                );


                envmap =
                    pmremGenerator
                        .fromEquirectangular(
                            texture
                        )
                        .texture;


                texture.flipY = false;

                texture.premultiplyAlpha =
                    false;


                scene.environment =
                    envmap;


                texture.dispose();


                // =================================================
                // GLTF LOADER
                // =================================================

                const loader =
                    new GLTFLoader()
                        .setPath("3d/");


                loader.load(

                    model + ".glb",

                    function (gltf) {

                        console.log(
                            "Modèle "
                            + model
                            + ".glb chargé"
                        );


                        current_object =
                            gltf.scene;


                        scene.add(
                            current_object
                        );


                        // -------------------------------------------------
                        // POSITION INITIALE
                        // -------------------------------------------------

                        current_object.position.set(
                            0,
                            0,
                            -2
                        );


                        // -------------------------------------------------
                        // CENTRAGE
                        // -------------------------------------------------

                        const box =
                            new THREE.Box3();


                        box.setFromObject(
                            current_object
                        );


                        box.center(
                            controls.target
                        );


                        controls.update();


                        current_object.visible =
                            true;


                        render();

                    },


                    // -------------------------------------------------
                    // PROGRESSION
                    // -------------------------------------------------

                    function (xhr) {

                        if (
                            xhr.total > 0
                        ) {

                            console.log(
                                "Chargement : "
                                +
                                Math.round(
                                    xhr.loaded /
                                    xhr.total *
                                    100
                                )
                                +
                                "%"
                            );

                        }

                    },


                    // -------------------------------------------------
                    // ERREUR
                    // -------------------------------------------------

                    function (error) {

                        console.error(
                            "Erreur lors du chargement du GLB :",
                            error
                        );

                    }

                );

            },


            undefined,


            // -------------------------------------------------
            // ERREUR HDR
            // -------------------------------------------------

            function (error) {

                console.error(
                    "Erreur lors du chargement du HDR :",
                    error
                );

            }

        );
}


// =====================================================
// HIT TEST
// =====================================================

function setupHitTestSource() {

    const session =
        renderer.xr.getSession();


    if (!session) {
        return;
    }


    // -------------------------------------------------
    // REFERENCE SPACE VIEWER
    // -------------------------------------------------

    session
        .requestReferenceSpace(
            "viewer"
        )
        .then(
            function (referenceSpace) {

                return session
                    .requestHitTestSource({
                        space: referenceSpace
                    });

            }
        )
        .then(
            function (source) {

                hitTestSource =
                    source;


                console.log(
                    "Hit-test activé"
                );

            }
        )
        .catch(
            function (error) {

                console.error(
                    "Erreur Hit-test :",
                    error
                );

            }
        );


    // =================================================
    // FIN DE SESSION
    // =================================================

    session.addEventListener(
        "end",
        function () {

            hitTestSourceRequested =
                false;

            hitTestSource =
                null;

            reticle.visible =
                false;


            // -------------------------------------------------
            // RECENTRAGE DE L'OBJET
            // -------------------------------------------------

            if (current_object) {

                const box =
                    new THREE.Box3();


                box.setFromObject(
                    current_object
                );


                box.center(
                    controls.target
                );


                controls.update();

            }


            // -------------------------------------------------
            // CACHER LE BOUTON PLACE
            // -------------------------------------------------

            const placeButton =
                document.getElementById(
                    "place-button"
                );


            if (placeButton) {

                placeButton.style.display =
                    "none";

            }

        }
    );
}


// =====================================================
// ON SELECT
// =====================================================

function onSelect() {

    console.log(
        "SELECT détecté"
    );


    if (
        reticle.visible &&
        current_object
    ) {

        // -------------------------------------------------
        // POSITIONNER L'OBJET SUR LE RETICLE
        // -------------------------------------------------

        current_object
            .position
            .setFromMatrixPosition(
                reticle.matrix
            );


        // -------------------------------------------------
        // AFFICHER L'OBJET
        // -------------------------------------------------

        current_object.visible =
            true;


        console.log(
            "Objet placé !"
        );

    }
}


// =====================================================
// RENDER
// =====================================================

function render(
    timestamp,
    frame
) {

    // =================================================
    // MODE AR
    // =================================================

    if (
        frame &&
        renderer.xr.isPresenting
    ) {

        // -------------------------------------------------
        // DEMANDE DU HIT TEST
        // -------------------------------------------------

        if (
            !hitTestSourceRequested
        ) {

            setupHitTestSource();

            hitTestSourceRequested =
                true;

        }


        // -------------------------------------------------
        // HIT TEST DISPONIBLE
        // -------------------------------------------------

        if (
            hitTestSource
        ) {

            const referenceSpace =
                renderer.xr.getReferenceSpace();


            const hitTestResults =
                frame.getHitTestResults(
                    hitTestSource
                );


            // -------------------------------------------------
            // SURFACE DETECTEE
            // -------------------------------------------------

            if (
                hitTestResults.length > 0
            ) {

                const hit =
                    hitTestResults[0];


                const pose =
                    hit.getPose(
                        referenceSpace
                    );


                if (pose) {

                    // Le cercle devient visible

                    reticle.visible =
                        true;


                    // Position du cercle

                    reticle.matrix.fromArray(
                        pose.transform.matrix
                    );


                    // Afficher éventuellement
                    // le bouton PLACE

                    const placeButton =
                        document.getElementById(
                            "place-button"
                        );


                    if (placeButton) {

                        placeButton.style.display =
                            "block";

                    }

                }

            }


            // -------------------------------------------------
            // AUCUNE SURFACE
            // -------------------------------------------------

            else {

                reticle.visible =
                    false;


                const placeButton =
                    document.getElementById(
                        "place-button"
                    );


                if (placeButton) {

                    placeButton.style.display =
                        "none";

                }

            }

        }

    }


    // =================================================
    // RENDU
    // =================================================

    renderer.render(
        scene,
        camera
    );
}


// =====================================================
// RESIZE
// =====================================================

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    // IMPORTANT :
    // setSize ne doit pas être appelé
    // pendant une session XR

    if (
        !renderer.xr.isPresenting
    ) {

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
}