# ADR008: Text formatting

Status: accepted

The text of shapes can be formatted using a restricted set of HTML as a format type.

```json
{
  "type": "shape",
  "kind": "rectangle",
  "position": {
    "x": 0,
    "y": 0
  },
  "width": 100,
  "height": 50,
  "textFormat": "custom.html",
  "text": "Hello <strong>World</strong>!"
}
```

This introduces a new property `textFormat` which is either missing or has the value `custom.text`. If it is missing, the property `text` contains plain text. If it has the value `custom.text`, it's expected to be the restricted subset of HTML described in this document.

Allow the following tags:

- `<br>` – new line
- `<span style="">` – all following styles are optional
  - `background-color`
  - `color`: hex RGB values like `#012` and `#001122`
  - `font-family`
  - `font-size`
    - If this is used, the auto font size on the element will likely become very complicated to implement.
  - `font-style`: `normal` and `italic`
  - `font-weight`: `normal` and `bold`
  - `text-decoration`: `none` and `line-through`
- `<a href="">` – links

## Transformation to SVG

In SVG, we use `<text>` and `<tspan style="">` to represent the formatting.

```svg
<text>Hello <tspan style="font-size:74.6667px">World</tspan>!</text>
```

Links can become `<a xlink:href="">`. Ensure this is safe with `rel="noopener"` and `target="_blank"` or whatever is required. I have not looked this up for SVG.

## Considered alternatives

### Using `<b>`, `<em>` etc.

There is no tag which does the reverse, so

### Custom JSON format

In comparison to storing formatted text in JSON, HTML is already well-defined and tested. A JSON format would try to re-implement many things we already have in HTML.
