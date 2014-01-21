WIT WEB SERVER v1.1.0
=====================
Serveur web de développement
----------------------------

#Définition
Ce projet est une application [NodeJS] permettant de créer un serveur WEB local de développement.

Il se trouve sous la forme d'un package [npm].

#Fonctionnalités
Cette application va créer un serveur sur l'addresse `http://localhost:8080/`
en ciblant la racine de site web dans le répertoire courant.

Il est possible de choisir un autre port, et un autre répertoire racine du site web.

La page par défaut à la racine du site est `index.html`.

Il supporte l'usage du `favicon.ico` s'il est placé à la racine du site.

Les requêtes d'URL sont supportées.

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

* La dernière version de [NodeJS] doit être installé sur le système.

#Installation

1. Cloner ce projet dans le répertoire de votre choix.
2. Placer vous dans ce répertoire et installer le package dans votre système.

Tapper :

    DOS> npm install -g

#Désinstallation
Désinstaller le package en tappant la commande suivante :

    DOS> npm uninstall -g wit-web-server

#Usages

##Lancer l'application
Pour lancer l'application avec les paramètres par défaut :

    DOS> wit-web-server

Avec cette commande, l'application va créer un serveur sur l'addresse `http://localhost:8080/` en ciblant la *racine de site web* vers le *répertoire courant*.


##Exécution avec un autre port
Pour lancer l'application et pour que le serveur utilise un autre port que celui par défaut `8080`, ajouter `PORT x` où `x` est le nouveau port.

Exemple la commande :

    DOS> wit-web-server PORT 88

Avec cette commande, l'application va créer un serveur accessible à l'adresse `http://localhost:88/` en ciblant la *racine de site web* vers le *répertoire courant*.

##Exécution avec un autre répertoire cible
Pour lancer l'application et pour que le serveur utilise une autre racine que le répertoire courrant, ajouter `BASEDIR x` à votre commande où `x` est le nouveau chemin *relatif* ou
*absolu* entre guillemets `"`.

Exemple :

    DOS> wit-web-server BASEDIR "..\rep\httpdocs"

Avec cette commande, l'application va créer un serveur accessible à l'adresse `http://localhost:8080/` en ciblant la *racine de site web* vers le répertoire `..\rep\httpdocs\`.

##Arrêt de l'application

Pour arrêter l'application, tapper `Ctrl+C`.

[NodeJS]: http://nodejs.org/
[npm]: https://npmjs.org/

#A venir

 * pouvoir personnaliser des actions.
 * Ajouter un test de chargement de tous les type-mimes.