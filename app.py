import pickle
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import streamlit as st
import pandas as pd
import plotly.express as px

# Page configuration
st.set_page_config(
    page_title="Toxic Comment Analyzer",
    page_icon="🛡️",
    layout="wide"
)

# Custom CSS
st.markdown("""
    <style>
    .main {
        padding: 2rem;
    }
    .stTextArea textarea {
        border-radius: 10px;
        border: 2px solid #e0e0e0;
        padding: 10px;
        font-size: 16px;
    }
    .stButton button {
        border-radius: 20px;
        padding: 10px 25px;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    div[data-testid="metric-container"] {
        background-color: #ffffff;
        border: 1px solid #f0f0f0;
        border-radius: 10px;
        padding: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    </style>
    """, unsafe_allow_html=True)

# Load model and tokenizer
@st.cache_resource
def load_model_and_tokenizer():
    model = load_model("tox_model.h5")
    with open('tokenizer.pickle', 'rb') as handle:
        tokenizer = pickle.load(handle)
    return model, tokenizer

model, tokenizer = load_model_and_tokenizer()

def predict_custom_comment(comment):
    tokenized_comment = tokenizer.texts_to_sequences([comment])
    padded_comment = pad_sequences(tokenized_comment, maxlen=100)
    prediction = model.predict(padded_comment)
    return {field: round(float(score), 4) for field, score in 
            zip(["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"], prediction[0])}

# Header section
st.title("🛡️ Toxic Comment Analyzer")

# Main interface
col1, col2 = st.columns([2, 1])

with col1:
    custom_comment = st.text_area(
        "Enter text for analysis:",
        height=150,
        placeholder="Type or paste your text here..."
    )

    if st.button("🔍 Analyze Text", use_container_width=True):
        if custom_comment:
            with st.spinner("Analyzing text..."):
                prediction = predict_custom_comment(custom_comment)
                
                # Convert predictions to DataFrame for visualization
                df = pd.DataFrame({
                    'Category': prediction.keys(),
                    'Score': prediction.values()
                })
                
                # Create bar chart
                fig = px.bar(
                    df,
                    x='Category',
                    y='Score',
                    color='Score',
                    color_continuous_scale='RdYlBu_r',
                    range_y=[0, 1]
                )
                fig.update_layout(
                    title='Toxicity Analysis Results',
                    xaxis_title='',
                    yaxis_title='Probability Score',
                    plot_bgcolor='white'
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Display metrics for highest risk categories
                st.subheader("Key Findings")
                metrics = st.columns(3)
                sorted_pred = sorted(prediction.items(), key=lambda x: x[1], reverse=True)
                for i, (category, score) in enumerate(sorted_pred[:3]):
                    with metrics[i]:
                        st.metric(
                            label=category.replace('_', ' ').title(),
                            value=f"{score:.1%}"
                        )
        else:
            st.error("Please enter some text to analyze.")

with col2:
    st.markdown("""
    ### About the Categories
    
    - **Toxic**: General toxicity
    - **Severe Toxic**: Extreme toxicity
    - **Obscene**: Explicit content
    - **Threat**: Threatening language
    - **Insult**: Insulting content
    - **Identity Hate**: Bias against identity groups
    
    ### How to Use
    1. Enter or paste text in the input box
    2. Click "Analyze Text"
    3. View results in the interactive chart
    4. Check detailed metrics below
    
    > 💡 The scores range from 0 (safe) to 1 (high risk)
    """)
