WEB SERVER v1.0.0
=================
Serveur web de développement
----------------------------

#Définition
Ce dossier contient l'application [NodeJS] permettant de créer un serveur WEB local de développement.

#Fonctionnalités
Cette application va créer un serveur sur l'addresse `http://localhost:8080/`
en ciblant la racine de site web dans le répertoire courant.

Il est possible de choisir un autre port, et un autre répertoire racine du site web.

La page par défaut à la racine du site est `index.html`.

Il supporte l'usage du `favicon.ico` placé à la racine du site.

##Type-Mimes supportés
Voici ci-dessous la liste des extensions et type-mimes supportés par l'application :

|Extensions | Type-Mimes         |
|--------   | ------------------ |
|`.html`    |  `text/html`       |
|`.js`      |  `text/javascript` |
|`.css`     |  `text/css`        |
|`.less`    |  `text/css`        |
|`.json`    |  `text/json`       |

#Environnement requis

* [NodeJS] doit être installé sur le système.

#Installation

Placer tout simplement le répertoire `web-server\` dans le répertoire de votre choix de votre projet.

#Usages

##Lancer l'application
Pour lancer l'application avec les paramètres par défaut :

    DOS> node [path]\web-server\app.js
où `[path]` est le chemin vers le repertoire `web-server\`.

Avec cette commande, l'application va créer un serveur sur l'addresse `http://localhost:8080/` en ciblant la racine de site web dans le répertoire courant.


##Exécution avec un autre port
Pour lancer l'application et que le serveur utilise un autre port que `8080`, ajouter `PORT x` où `x` est le nouveau port.
Exemple la commande :

    DOS> node [path]\web-server\app.js PORT 88
où `[path]` est le chemin vers le repertoire `web-server\`.

Avec cette commande, l'application va créer un serveur accessible à l'adresse `http://localhost:88/` en ciblant la racine de site web dans le répertoire courant.

##Exécution avec un autre répertoire cible
Pour lancer l'application et que le serveur utilise une autre racine que le répertoire courrant, ajouter `BASEDIR x` où `x` est le nouveau chemin **relatif** ou
**absolu** entre guillemets (`"`).
Exemple :

    DOS> node [path]\web-server\app.js BASEDIR "..\rep\httpdocs"
où `[path]` est le chemin vers le repertoire `web-server\`.

Avec cette commande, l'application va créer un serveur accessible à l'adresse `http://localhost:8080/` en ciblant la racine de site web dans le répertoire `..\rep\httpdocs\`.

##Arrêt de l'application

Pour arrêter l'application, tapper `Ctrl+C`.

[NodeJS]: http://nodejs.org/

#A venir

* support des actions?