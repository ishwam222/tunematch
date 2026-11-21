# TuneMatch Website Starter

This is a Flask website starter with a responsive dark-purple frontend and the TuneMatch V5 recommendation logic.

## 1. Export your existing notebook data

In the same notebook where `model_df` and `scaled_features` are already defined, run:

```python
import pickle
from pathlib import Path

website_data = Path(r"PATH_TO_THIS_FOLDER/data")
website_data.mkdir(parents=True, exist_ok=True)

with open(website_data / "model_df.pkl", "wb") as f:
    pickle.dump(model_df, f)

with open(website_data / "scaled_features.pkl", "wb") as f:
    pickle.dump(scaled_features, f)

print("TuneMatch data exported successfully!")
```

Replace `PATH_TO_THIS_FOLDER` with the actual extracted folder path, for example:
`C:\Users\YOUR_USERNAME\Downloads\TuneMatch_Website_Starter`

Keep the DataFrame indexes aligned exactly as they are in the notebook. Do not rerun/reset the index on either object before exporting.

## 2. Install requirements

Open PowerShell in this folder and run:

```powershell
py -m pip install -r requirements.txt
```

## 3. Start the website

```powershell
py app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Project structure

- `app.py`: Flask backend and V5 recommendation function
- `templates/index.html`: page structure
- `static/style.css`: responsive design, CSS gradients and animations
- `static/app.js`: search request and result rendering
- `data/`: exported notebook data goes here

## Notes

- The website does not call Spotify or play full songs. The player artwork is decorative UI for now.
- Recommendation percentages are the same cosine-similarity values displayed by V5; they are not probabilities.
- Keep `data/` private if you publish the project; it contains the dataset.
- This starter expects the same `model_df` and `scaled_features` objects used by V5.
