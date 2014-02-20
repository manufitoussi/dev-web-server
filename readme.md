WIT WEB SERVER v1.2.0
=====================
Serveur web de développement
----------------------------

# Définition
Ce projet est une application [NodeJS] permettant de créer un serveur WEB local de développement.

Il se trouve sous la forme d'un package [npm].

# Fonctionnalités
Cette application va créer un serveur sur l'addresse `http://localhost:8080/`
en ciblant la racine de site web dans le répertoire courant.

Il est possible de spécifier :
- un port,
- un répertoire racine du site web,
- un délai de requête
- un ensemble de terminaisons de service `AJAX`.

La page par défaut à la racine du site est `index.html`.

Il supporte l'usage du `favicon.ico` s'il est placé à la racine du site.

Les requêtes `POST` et `GET` sont supportées.

## Type-Mimes supportés
Voici ci-dessous la liste des extensions et type-mimes supportés par l'application :

|Extensions | Type-Mimes       |
|--------   | ---------------- |
|`.html`    |  text/html       |
|`.js`      |  text/javascript |
|`.css`     |  text/css        |
|`.less`    |  text/css        |
|`.json`    |  text/json       |

# Environnement requis

* La dernière version de [NodeJS] doit être installé sur le système.

# Installation

1. Cloner ce projet dans le répertoire de votre choix.
2. Placer vous dans ce répertoire et installer le package dans votre système.

Tapper :
```dos
npm install -g
```

# Désinstallation
Désinstaller le package en tappant la commande suivante :

```dos
npm uninstall -g wit-web-server
```

# Usages

## Lancer le serveur
Pour lancer le serveur avec les paramètres par défaut :

```dos
wit-web-server
```

Avec cette commande, l'application va créer un serveur :
- sur l'addresse `http://localhost:8080/`
- en ciblant la *racine de site web* vers le *répertoire courant*
- sans délai de requête
- sans terminaison de service `AJAX`.

## Les paramètres

| Paramètre   | Description      |
|------------ | ---------------- |
| `PORT`      |  Choisir un port (défaut : `8080`) |
| `BASEDIR`   |  Chemin *relatif* ou *absolu* vers la racine du domaine (défaut : *répertoire courant*) |
| `DELAY`     |  Délai en milliseconde avant chaque réponse `AJAX` du serveur (défaut : `0` ms) |
| `ENDPOINTS` |  Chemin *relatif* ou *absolu* vers le fichier contenant les terminaisons de services AJAX *(voir sa définition)* |

## Exemples
```dos
wit-web-server PORT 1234 BASEDIR ..\rep\httpdocs DELAY 2000 ENDPOINTS ..\rep\server\my-endpoints.js
```
Cette commande lancera un serveur :
- accessible à l'adresse `http://localhost:1234/`
- en ciblant la *racine de site web* vers le répertoire `..\rep\httpdocs\`
- avec un délai de `2000` ms avant chaque réponse `AJAX`
- des définitions de terminaisons de services `AJAX` définit dans le fichier au chemin `..\rep\server\my-endpoints.js`.

## Définition des terminaisons de service `AJAX`

Des terminaisons de service `AJAX` peuvent être définis dans un fichier de script [NodeJS]. Ce dernier doit renvoyer un objet `JavaScript` contenant les définitions des terminaisons sous la forme d'un dictionnaire. La clef est l'`URL` de la terminaison, la valeur est la méthode à exécuter.

### La méthode de terminaison

La méthode de terminaison permet de définir la requête. Elle prend comme argument :

| Argument | Type |Description |
| --- | --- | --- |
| req | `Request` | Objet de requête [NodeJS] |
| res | `Response` | Objet de réponse [NodeJS] |
| params | `Object` | Objet d'argument de la requête (pris depuis le `body` ou la `querystring`) |
| sendSuccess | `Function` | Fonction callback à appeler lors du succès de la requête |
| sendError | `Function` | Fonction callback à appeler lors de l'échec de la requête |

#### Le callback de succès

La méthode `sendSuccess` permet de renvoyer une réponse de succès contenant l'objet resultat de la requête. Elle prend comme argument :

| Argument | Type |Description |
| --- | --- | --- |
| req | `Request` | Objet de requête [NodeJS] |
| res | `Response` | Objet de réponse [NodeJS] |
| result | `Object` | Objet de résultat de la requête |

#### Le callback d'erreur ou d'échec

La méthode `sendError` permet de renvoyer une réponse d'échec contenant l'objet d'erreur en résultat de la requête. Ell prend comme argument :

| Argument | Type |Description |
| --- | --- | --- |
| req | `Request` | Objet de requête [NodeJS] |
| res | `Response` | Objet de réponse [NodeJS] |
| httpCode | `Numeric` | Code `HTTP` de réponse su serveur |
| message | `string` | Message text de l'erreur |
| result | `Object` | Objet de résultat de la requête |

Exemple :

```js
var Repository = {
  count:0
};

module.exports = {
  '/example': function (req, res, params, sendSuccess, sendError) {
    sendSuccess(req, res, {
      test: 'coucou',
      count: Repository.count++
    });
  },

  '/exampleError': function (req, res, params, sendSuccess, sendError) {
    sendError(req, res, 401, "erreur d'authentification");

    // Le résultat de cet requête sera : { code: 401, message: "erreur d'authentification"}.
  }
};

```

## Arrêt de l'application

Pour arrêter l'application, tapper `Ctrl+C`.

[NodeJS]: http://nodejs.org/
[npm]: https://npmjs.org/
