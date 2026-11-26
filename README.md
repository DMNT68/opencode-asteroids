# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `X`       | Activar escudo |
| `C`       | Cambiar skin |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Power-up **Velocidad**: al destruir un asteroide puede aparecer un ítem cian; al recogerlo duplica el empuje de la nave durante 5 segundos
- Power-up **Triple**: el ítem magenta activa durante 5 segundos un disparo de 3 balas paralelas en línea recta; es acumulable con el de velocidad
- Estrella fugaz: cruza la pantalla a gran velocidad, se desvanece sola, se puede disparar (150 puntos) y no impide pasar de nivel
- Naves enemigas: aparecen en cada nivel, se mueven por la pantalla y disparan hacia la nave (200 puntos al destruirlas)
- Escudo: con `X` se activa durante 2,5 segundos y bloquea los proyectiles enemigos; luego tarda 6 segundos en recargarse
- Skins: con `C` se cambia la apariencia de la nave (5 variantes, se recuerda la última elegida)
- Partículas de explosión al destruir asteroides
