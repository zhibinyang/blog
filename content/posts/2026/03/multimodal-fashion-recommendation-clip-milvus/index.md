---
title: "向量对撞的浪漫：用 CLIP 和 Milvus 重塑多模态服装推荐系统"
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

> 最近两天，我手痒抽空基于 H&M 2022 年 Kaggle 竞赛的十万级真实开源数据，动手搭建了一套简易但极具启发性的多模态服装推荐系统。这趟测试让我深刻意识到：向量数据库绝不仅仅是 RAG（检索增强生成）存放枯燥切片文本的冰冷仓库。当具有多模态能力的 CLIP 模型将视觉特征与语言概念强行对齐在同一个高维 512 维空间时，原本只存在于字里行间的“文字相似”，逐步升维成了能真正“审视理解”图片的二维认知。虽然整体架构并不复杂，但这其中发生的几次不可思议的“向量加减法”（比如剪切衣袖、染改颜色），实实在在地重塑了我对多模态落地的宏观认知。

<!--more-->

![封面图](assets/cover.jpg)

我的测试台建立在 H&M 庞大的 Kaggle 竞赛数据集之上。这份数据不仅包含了 10 万余张不含模特的各类商品白底照，更极其慷慨地附带了结构化极其清晰的元数据描述文件（横跨诸如 `product_type_name`、`colour_group_name`、`garment_group_name` 等近二十个细分字段）。

这恰好是验证多模态检索技术（Text-to-Image / Image-to-Image）最完美的天然试炼场。

## 双塔对齐：让文本与图像在同一维度“相认”

如果要让文字和图片产生交流，我们必须让它们开口说同一种高维语言。这里我直接选用了 OpenAI 经受过时间考验的爆款模型 —— **CLIP (ViT-B/32)**。CLIP 最大的魅力在于它的双塔结构：它分别用文本编码器和图像编码器，将截然不同的两种模态特征强行拽入同一个 512 维的数学空间里。

为了最大化榨取数据的金矿，我分别对文本和图像做了一套重度预处理流水线：

首先是对 **Text** 的组装。我没有单纯拿标签扔进去，而是利用那些精致的元数据，像拼乐高一样拼凑出一段长文本描述：
```python
desc = f"A {item['colour_group_name']} {item['prod_name']}, which is a {item['product_type_name']} from the {item['garment_group_name']} collection."
```
这段包含了颜色、品类、名称和服装系列的语句，交由 CLIP 抽取出了一段富含语义的文本向量。

其次是对 **Image** 的重构。H&M 的原始物料几乎全是修长的矩形竖图，但跑过图像大模型的人都知道，CLIP 喜欢的是端正的方图。直接 Reszie 会导致衣物严重拉伸变形（把修身衬衫压成均码风衣是不可接受的）。于是，我编写了一个全能 Pipeline：先提取长边，用边缘像素复制法（`cv2.BORDER_REPLICATE`）将长图“延展”成正方形，再进行高质量下采样收缩到所需的 `224x224` 分辨率。

最后，我在拥有 T4 GPU 的 Google Colab 上，用 Dataset + DataLoader 拉起高并发，一口气把这 10 万件商品统统向量化，连同原有的商品属性，规规矩矩地打包存成了极致压缩的 Parquet 文件。随后，通过极其轻量化的 PyMilvus 库构建了本地版的 `Milvus Lite`，将它们稳妥地刷入了一张支持多向量字段的超级表中。

至此，高维度的数字世界基座建成。接下来发生的事，才是真正的魔法。

## 场景一：朴实无华的图文互搜与混合召回

基础的以文搜图非常直接：你输入一段复杂的衣服特征，CLIP 转化成向量去 Milvus 里硬刚 `image_vector`。效果可以用立竿见影来形容，完全不需要传统的标签模糊匹配。如果是以图搜图也一样顺滑。你可以将其拓展成类似淘宝的“拍立淘”——挂一个 YOLO 在前面把画面里的衣服精准抠出来，只将衣服本身喂给向量数据库搜索，同店平替瞬间拉满。

甚至你还能赋予文本和图像不同的权重（比如各占 50% 权重），做一种“按照这张参考图的版型，找一件符合我文字描述气质的衣服”的混合搜索能力。

## 场景二：向量加减法——从“换皮”到“改款”的神奇认知

这是我在整个实验中最上头、也让我大呼过瘾的一段认知体验。

既然 CLIP 让颜色和形状共享同一个宇宙，那么是不是可以用线性代数来变魔术？我首先尝试了 **“换色”**。
比如，我看中了一件蓝色的衣服，但我想要同样的版型，只是换成红色。我的查询向量变成了这样：
$$ \text{Target Vector} = \text{Image Vector}_{\text{原图}} - \text{Text Vector}_{\text{“blue”}} + \text{Text Vector}_{\text{“red”}} $$

结果出奇的完美！因为颜色属于全局特征（Global Feature），系统召回的最 Top 服饰，不仅在版式、垂坠感、布料质感上和原先惊人的相似，唯独颜色被硬生生地替换成了精准的红色。

紧接着，我进行了更作死的局部尝试：**“长袖改短袖”**。
我想象这和颜色如出一辙。于是我针对一件长袖牛仔质感的衬衫，进行了两次天真的尝试：
第一次，我单纯地减去 `"long sleeve"`，加上 `"short sleeve"`。结果搜出来的依然是几乎一模一样的长袖衬衫，局部特征的权重似乎完全被整体版型压制了。
第二次，我加大了力度，尝试减去 `"long sleeve shirt"`，加上 `"short sleeve t-shirt"`。结果依然翻车，搜出来的不仅还是长袖衬衫，甚至原先那种厚重的牛仔质感也变得有些四不像了。

AI 是怎么想的？后来我领悟了：**当你从原版衬衫的向量里减去 “shirt” 时，其实等于把这件衣服之所以为衬衫的领口、面料、硬挺感这种“灵魂特质”连包带盒一起拔除了**，导致向量偏航。

于是我微调了策略，去寻找那些描述全局厚度特征但不触及衣服本体质感的词汇。我更改了公式：
$$ \text{Target Vector} = \text{Image Vector} - \text{Text Vector}_{\text{“long sleeve sweater”}} + \text{Text Vector}_{\text{“short sleeve t-shirt”}} $$

魔法再次生效！减去 `sweater`（毛衣）实质上去掉了那种“厚重”与“修长包裹”的特征，而加上 `t-shirt` 加回了“轻薄”与“短截”的意象，而“牛仔衬衫”本体那硬朗的丹宁感在未受破坏的底层基向量中得到了完美保留。最终搜出来的是一件质地相当硬朗的短袖牛仔丹宁衬衫！这种用文字操控图像实质（Prompt Engineering via Vector Math的乐趣）实在是绝妙。

## 场景三：“像”并不等于“搭”的残缺

纯向量最容易暴露短板的地方在于“服装搭配”。
如果你丢给系统一件质感绝佳的外套，并且强制利用元数据 `Filter` 只过滤出下装。Milvus 确实会忠诚地找出一件无论是纹理、材质都与上装极其匹配的裤子。但这会导致什么结果？你大概率只会配出一套同色系的纯色套装，或者干脆是一套运动服 / 内衣。真正潮流圈“上白下黑”或者“软硬混搭”的视觉冲突，纯靠相似度向量是算不出来的。

这是因为“搭配”属于人类沉淀下来的经验法则。这里必须降维打击，引入其他手段：一方面可以利用 Kaggle 竞赛自带的匿名交易数据，跑协同过滤构建一个“买了这件上衣的人还会买这件裤子”的知识图谱；另一方面，利用通用 LLM （大语言模型）。把那段构建好的元数据文本甩给大模型，让大模型分析这件上衣应该配什么气质的裤子，并要求结构化输出，然后再拿这段由 LLM 推荐构建的文本向量去库里做纯文搜图。

## 场景四：被同质化包围时的救星——MMR 多样性打分

做推荐搜索最容易陷入的另一个泥潭是信息茧房：由于精准匹对，Milvus 扔回来的 Top 10 商品往往在你人类肉眼看来，根本就是 10 件同一款的衣服（甚至可能是不同商家的重复供货）。

真正优质的推荐，必须在“极其相似”之中插入一些“耳目一新的变体”。

这就不得不请出推荐系统里的老面孔—— **MMR (Maximal Marginal Relevance)** 算法。我会先让 Milvus 捞出最相似的 Top 100 候选集，然后使用一个 `lambda` 参数（比如设置为 0.5）。模型在挑选接下来呈现给用户的候选衣服时，既要保证他和原图有高的相似度权重，又要扣除它与“当前已挑出衣服之间的高重复度”惩罚权重。一句话概括就是：给我找和目标最像的，但已经展现过的风格，就别再霸屏了。

---

## 核心实现代码附录

最后，附上这些核心认知的关键 Python 实现源码，供有志于此的同好们一窥全貌：

### 1. 将海量长图化为方形的高性能预处理流水线
```python
import cv2
from PIL import Image

def transform_big_to_clip_input(image_path, target_size=224):
    """
    大图改小图的全能 Pipeline：边缘像素复制填充 + 高质量下采样
    """
    img_array = cv2.imread(str(image_path))
    if img_array is None:
        return None

    h, w = img_array.shape[:2]

    # 1. 边缘像素复制填充（大图正方形化）
    max_side = max(h, w)
    top = (max_side - h) // 2
    bottom = max_side - h - top
    left = (max_side - w) // 2
    right = max_side - w - left

    square_img = cv2.copyMakeBorder(
        img_array, top, bottom, left, right,
        borderType=cv2.BORDER_REPLICATE
    )

    # 2. 高质量下采样
    final_img = cv2.resize(
        square_img,
        (target_size, target_size),
        interpolation=cv2.INTER_AREA
    )

    # 3. 从 BGR NumPy 转换为 RGB PIL Image
    final_img_rgb = cv2.cvtColor(final_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(final_img_rgb)
```

### 2. 构建包含多向量字段的超级表 (PyMilvus)
```python
from pymilvus import MilvusClient, DataType

client = MilvusClient("milvus_demo_1.db")
collection_name = "hm_articles_v1"

# 显式创建 Schema 以支持多向量字段 (文本向量和图像向量共存)
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

### 3. 长短袖魔法：基于常识别能力的向量加减运算
```python
import numpy as np
import torch
import clip

text_description_types = ['long sleeve sweater', 'short sleeve t-shirt']
text_tokens = clip.tokenize(text_description_types).to(device)

with torch.no_grad():
  text_features = model.encode_text(text_tokens)
  # 必须归一化后才能进行稳定加减
  text_features /= text_features.norm(dim=-1, keepdim=True)

v_long_concept = text_features[0]
v_short_concept = text_features[1]

# 取出数据库里一件长袖丹宁衬衫的原始向量
v_base_image = np.array(df[df['article_id']==784924001]['image_embedding'].iloc[0])
v_base_tensor = torch.from_numpy(v_base_image).to(device)

# 核心魔法：原图 - 长袖毛衣 + 短袖T恤
v_target_unnorm = v_base_tensor + 1 * (v_short_concept - v_long_concept)

# 重新归一化以便用于 Milvus 最高效的 IP 内积搜寻
v_target_final = v_target_unnorm / v_target_unnorm.norm(dim=-1, keepdim=True)
query_vector_for_milvus = v_target_final.cpu().numpy().flatten().tolist()

# 送入 Milvus 执行搜索...
```

### 4. 救市神器：保障推荐多样性的 MMR 算法打分
```python
import numpy as np

def mmr(query_vec, candidate_vecs, candidate_ids, lambda_param=0.5, top_k=5):
    """
    query_vec: 搜索基准向量 (1, 512)
    candidate_vecs: Milvus 最初返回的 Top 100 极其相似的向量集
    """
    selected_indices = [0] # 默认把最像的第一名无条件选进去
    remaining_indices = list(range(1, len(candidate_vecs)))

    while len(selected_indices) < top_k:
        mmr_scores = []
        for i in remaining_indices:
            # 1. 相似度得分
            relevance = np.dot(candidate_vecs[i], query_vec)

            # 2. 惩罚项：与已经确定的结果之间的冗余度
            redundancy = max([np.dot(candidate_vecs[i], candidate_vecs[j]) for j in selected_indices])

            # 3. 终局博弈：MMR 调和得分
            score = lambda_param * relevance - (1 - lambda_param) * redundancy
            mmr_scores.append((score, i))

        # 选出这轮博弈中得分最高的放入展示篮子
        best_score, best_idx = max(mmr_scores)
        selected_indices.append(best_idx)
        remaining_indices.remove(best_idx)

    return [candidate_ids[i] for i in selected_indices]
```

当 AI 揭开了维度折叠的帷幕后，很多过去用 SQL 或关键字堆砌出来的模糊体验，如今变成了可计算、可编程的精确艺术。这一次，我真切体会到了多模态的浪漫。