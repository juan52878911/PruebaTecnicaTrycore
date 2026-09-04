# Frontend - Sistema de Valor Ganado

Esqueleto del frontend Angular. Sin funcionalidad de negocio todavía: eso llega en una fase
posterior.

## Instalación

```bash
npm install
```

## Arranque con proxy hacia el backend

`npm start` ejecuta `ng serve` con `proxy.conf.json`, que redirige las peticiones a `/api`
hacia `http://localhost:8080`. El backend debe estar levantado en ese puerto.

```bash
npm start
```

## Lint

```bash
npm run lint
```

## Formato

```bash
npm run format
```

## Build

```bash
npm run build
```
