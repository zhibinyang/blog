---
title: "The Romance of Vector Collision: Reshaping Multimodal Fashion Recommendation with CLIP and Milvus"
date: 2026-03-30T15:00:00+08:00
tags:
- clip
- milvus
- ai
- multimodal
- python
categories:
- ai
- data-science
comment: true
featuredImagePreview: "assets/cover-preview.jpg"
---

> Over the past couple of days, I scratched an itch and built a simple yet highly enlightening multimodal fashion recommendation system based on the Kaggle H&M 2022 dataset containing 100,000+ real-world open-source images. This experiment profoundly made me realize: Vector databases are by no means just cold warehouses for RAG (Retrieval-Augmented Generation) to store dry sliced text. When the multimodal-capable CLIP model forcefully aligns visual features and linguistic concepts within the same high-dimensional 512D space, the "text similarity" that previously existed only between lines of words gradually ascends into a 2D cognition capable of truly "scrutinizing and understanding" images. Although the overall architecture is not complex, the incredible "vector math" (such as trimming sleeves or dyeing colors) that occurred during this process has solidly reshaped my macro understanding of multimodal applications.

<!--more-->

![Cover](assets/cover.jpg)

My testbed was built upon H&M's massive Kaggle competition dataset. This dataset not only contains over 100,000 model-less, white-background product photos but also generously includes extremely well-structured metadata description files (spanning nearly twenty granular fields such as `product_type_name`, `colour_group_name`, `garment_group_name`, etc.).

This is the perfect natural proving ground for verifying multimodal retrieval techniques (Text-to-Image / Image-to-Image).

## Dual-Tower Alignment: Making Text and Images "Recognize" Each Other in the Same Dimension

If we want text and images to communicate, we must make them speak the same high-dimensional language. Here, I directly opted for OpenAI's time-tested blockbuster model — **CLIP (ViT-B/32)**. The greatest charm of CLIP lies in its dual-tower structure: it uses a text encoder and an image encoder to forcibly drag two entirely different modal features into the identical 512-dimensional mathematical space.

To maximize the extraction of this data goldmine, I built a heavy-duty preprocessing pipeline for both text and images respectively:

First, assembling the **Text**. I didn't simply toss tags in; instead, I utilized that exquisite metadata to assemble a long text description like LEGO bricks:
```python
desc = f"A {item['colour_group_name']} {item['prod_name']}, which is a {item['product_type_name']} from the {item['garment_group_name']} collection."
```
This sentence, encapsulating color, category, name, and clothing collection, was handed over to CLIP to extract a semantically rich text vector.

Next came reconstructing the **Image**. H&M's original assets were almost entirely slender, rectangular portrait images. However, anyone who has run large image models knows that CLIP prefers perfectly square images. Directly performing a Resize would cause severe stretching and distortion of the garments (squashing a slim-fit shirt into a one-size-fits-all trench coat is unacceptable). Thus, I wrote an all-in-one Pipeline: first extracting the long edge, using edge pixel replication (`cv2.BORDER_REPLICATE`) to "pad" the long image into a square, and then performing high-quality downsampling to shrink it to the required `224x224` resolution.

Finally, on a Google Colab instance equipped with a T4 GPU, I fired up high concurrency using Dataset + DataLoader, vectorizing all 100,000 products in one breath. Along with the original product attributes, they were neatly packed and saved into a highly compressed Parquet file. Subsequently, utilizing the extremely lightweight PyMilvus library to build a local `Milvus Lite` instance, they were safely flushed into a super-table supporting multi-vector fields.

At this point, the foundation of the high-dimensional digital world was established. What happened next was the real magic.

## Scenario 1: Unpretentious Cross-Modal Search and Hybrid Recall

Basic Text-to-Image search is very straightforward: you input a complex description of clothing features, CLIP transforms it into a vector, and it goes head-to-head with the `image_vector` in Milvus. The results are immediate and highly effective—there is absolutely no need for traditional fuzzy tag matching. Image-to-Image search is equally smooth. You can expand it into something similar to Taobao's "Pailitao" (Snap and Buy)—hang a YOLO model in front to precisely cut out the clothing from a scene, feed only the clothing itself into the vector database for searching, and instantly pull out identical or similar alternatives from the store.

You can even assign different weights to text and images (e.g., 50% weight each), creating a hybrid search capability like "Find clothes that fit the vibe of my text description, but follow the silhouette of this reference image."

## Scenario 2: Vector Math — The Magical Cognition from "Reskinning" to "Redesigning"

This was the most intoxicating and thrilling cognitive experience I had throughout the entire experiment.

Since CLIP puts colors and shapes in the same shared universe, can we perform magic tricks using linear algebra? I first attempted **"Color Swapping"**.
For example, I spot a blue garment, but I want the exact same silhouette, just in red. My query vector became this:
$$ \text{Target Vector} = \text{Image Vector}_{\text{Original}} - \text{Text Vector}_{\text{"blue"}} + \text{Text Vector}_{\text{"red"}} $$

The results were astonishingly perfect! Because color is a global feature, the top recalled garments from the system were strikingly similar to the original in silhouette, drape, and fabric texture, with only the color forcefully and precisely replaced with red.

Next, I pushed the envelope with a more perilous local modification attempt: **"Long Sleeve to Short Sleeve"**.
I imagined this would be just like changing colors. So, targeting a long-sleeved denim shirt, I made two naive attempts:
First, I simply subtracted `"long sleeve"` and added `"short sleeve"`. The results returned were still almost identical long-sleeved shirts. The weight of the local features seemed completely overpowered by the overall silhouette base vector.
Second, I escalated the intensity by attempting to subtract `"long sleeve shirt"` and add `"short sleeve t-shirt"`. It still failed miserably. The search results were not only still long-sleeved shirts, but even the original heavy denim texture had become somewhat of an unidentifiable mess.

What was the AI thinking? I later realized: **When you subtract "shirt" from the original shirt's vector, you are essentially uprooting the "soul characteristics" that make this garment a shirt—the collar, the fabric, the stiffness—lock, stock, and barrel.** This caused the vector to veer wildly off course.

So I fine-tuned the strategy, searching for vocabulary that described global thickness attributes without touching the garment's core texture. I changed the formula:
$$ \text{Target Vector} = \text{Image Vector} - \text{Text Vector}_{\text{"long sleeve sweater"}} + \text{Text Vector}_{\text{"short sleeve t-shirt"}} $$

The magic worked again! Subtracting `sweater` essentially stripped away the attributes of "heaviness" and "elongated wrapping," while adding `t-shirt` introduced concepts of "lightness" and "short/cropped cuts." Meanwhile, the rugged denim essence of the "denim shirt" itself was immaculately preserved within the untouched underlying base vector. The final result returned was a quite rugged short-sleeved denim shirt! This ability to manipulate the substance of images via text (the joy of Prompt Engineering via Vector Math) is truly sublime.

## Scenario 3: "Looks Like" Does Not Equal "Matches With" — The Incompleteness

The area where pure vectors most readily expose their shortcomings is in "outfit matching."
If you feed the system a superbly textured jacket and force it to use a metadata `Filter` to only return bottoms, Milvus will indeed loyally return a pair of pants that perfectly matches the top in both texture and material. But what does this lead to? You will most likely just assemble a monochrome, single-color suit, or perhaps a tracksuit/underwear set. The visual contrast of "white top, black bottom" or "soft-hard mix-and-match" favored by true fashion circles cannot be calculated purely by similarity vectors.

This is because "matching" is an empirical rule refined by human experience. Here, we must execute a dimensionality reduction strike and introduce other methods: On one hand, we can utilize the anonymized transaction data provided by the Kaggle competition to run collaborative filtering, building a knowledge graph of "people who bought this top also bought these pants"; on the other hand, we can utilize general LLMs (Large Language Models). Throwing that constructed metadata text to an LLM, asking it to analyze what vibe of pants should go with this top, requesting a structured output, and then using that LLM-recommended text vector to perform a pure Text-to-Image search in the database.

## Scenario 4: The Savior When Surrounded by Homogenization — MMR Diversity Scoring

Another quagmire that recommendation searches easily fall into is the information cocoon: Due to precise matching, the Top 10 products returned by Milvus often look entirely identical to the human eye (or might even be duplicate stock from different vendors).

A truly premium recommendation must inject some "refreshing variants" amidst the "extreme similarity."

This necessitates bringing out an old friend in recommendation systems—the **MMR (Maximal Marginal Relevance)** algorithm. I first have Milvus retrieve the Top 100 most similar candidate set, and then apply a `lambda` parameter (e.g., set to 0.5). When the model selects the next candidate garment to present to the user, it must guarantee high similarity weight to the original image, but simultaneously deduct a penalty weight for "high redundancy with the already selected garments." Summarized in one sentence: Find me the items most similar to the target, but if you've already shown me this style, stop monopolizing the screen.

---

## Core Implementation Code Appendix

Finally, I am attaching the key Python implementation source code for these core concepts, offering a glimpse of the big picture for fellow enthusiasts interested in this field:

### 1. High-Performance Preprocessing Pipeline: Morphing Massive Tall Images into Squares
```python
import cv2
from PIL import Image

def transform_big_to_clip_input(image_path, target_size=224):
    """
    All-in-one Pipeline for reducing large images: Edge pixel replication padding + High-quality downsampling
    """
    img_array = cv2.imread(str(image_path))
    if img_array is None:
        return None

    h, w = img_array.shape[:2]

    # 1. Edge pixel replication padding (Squaring massive images)
    max_side = max(h, w)
    top = (max_side - h) // 2
    bottom = max_side - h - top
    left = (max_side - w) // 2
    right = max_side - w - left

    square_img = cv2.copyMakeBorder(
        img_array, top, bottom, left, right,
        borderType=cv2.BORDER_REPLICATE
    )

    # 2. High-quality downsampling
    final_img = cv2.resize(
        square_img,
        (target_size, target_size),
        interpolation=cv2.INTER_AREA
    )

    # 3. Convert from BGR NumPy to RGB PIL Image
    final_img_rgb = cv2.cvtColor(final_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(final_img_rgb)
```

### 2. Building a Super Table with Multi-Vector Fields (PyMilvus)
```python
from pymilvus import MilvusClient, DataType

client = MilvusClient("milvus_demo_1.db")
collection_name = "hm_articles_v1"

# Explicitly create Schema to support multi-vector fields (coexistence of text and image vectors)
schema = client.create_schema(auto_id=False, enable_dynamic_field=True)
schema.add_field(field_name="id", datatype=DataType.INT64, is_primary=True)
schema.add_field(field_name="image_vector", datatype=DataType.FLOAT_VECTOR, dim=512)
schema.add_field(field_name="text_vector", datatype=DataType.FLOAT_VECTOR, dim=512)

index_params = client.prepare_index_params()
index_params.add_index(field_name="image_vector", index_type="AUTOINDEX", metric_type="IP")
index_params.add_index(field_name="text_vector", index_type="AUTOINDEX", metric_type="IP")

client.create_collection(
    collection_name=collection_name,
    schema=schema,
    index_params=index_params
)
```

### 3. The Long/Short Sleeve Magic: Vector Math Based on Common Sense
```python
import numpy as np
import torch
import clip

text_description_types = ['long sleeve sweater', 'short sleeve t-shirt']
text_tokens = clip.tokenize(text_description_types).to(device)

with torch.no_grad():
  text_features = model.encode_text(text_tokens)
  # Normalization is mandatory for stable addition/subtraction
  text_features /= text_features.norm(dim=-1, keepdim=True)

v_long_concept = text_features[0]
v_short_concept = text_features[1]

# Extract the original vector of a long-sleeved denim shirt from the database
v_base_image = np.array(df[df['article_id']==784924001]['image_embedding'].iloc[0])
v_base_tensor = torch.from_numpy(v_base_image).to(device)

# Core Magic: Original Image - Long Sleeve Sweater + Short Sleeve T-Shirt
v_target_unnorm = v_base_tensor + 1 * (v_short_concept - v_long_concept)

# Re-normalize for optimal IP inner product search in Milvus
v_target_final = v_target_unnorm / v_target_unnorm.norm(dim=-1, keepdim=True)
query_vector_for_milvus = v_target_final.cpu().numpy().flatten().tolist()

# Send to Milvus to execute the search...
```

### 4. The Market Savior: MMR Algorithm Scoring to Guarantee Recommendation Diversity
```python
import numpy as np

def mmr(query_vec, candidate_vecs, candidate_ids, lambda_param=0.5, top_k=5):
    """
    query_vec: Baseline search vector (1, 512)
    candidate_vecs: Top 100 heavily similar vector set initially returned by Milvus
    """
    selected_indices = [0] # By default, unconditionally include the most similar #1
    remaining_indices = list(range(1, len(candidate_vecs)))

    while len(selected_indices) < top_k:
        mmr_scores = []
        for i in remaining_indices:
            # 1. Similarity Score
            relevance = np.dot(candidate_vecs[i], query_vec)

            # 2. Penalty Term: Redundancy with already finalized results
            redundancy = max([np.dot(candidate_vecs[i], candidate_vecs[j]) for j in selected_indices])

            # 3. Endgame: Harmonzied MMR Score
            score = lambda_param * relevance - (1 - lambda_param) * redundancy
            mmr_scores.append((score, i))

        # Select the highest-scoring item in this round and place it in the display basket
        best_score, best_idx = max(mmr_scores)
        selected_indices.append(best_idx)
        remaining_indices.remove(best_idx)

    return [candidate_ids[i] for i in selected_indices]
```

When AI lifts the veil on dimensional folding, many of the fuzzy experiences that were previously patched together using SQL or keyword stacking have now become computable, programmable precision arts. This time, I genuinely felt the romance of multimodality.
