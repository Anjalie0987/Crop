import pandas as pd

path = r'D:\CROP2\CROP2\BhoomiSanket\Maharashtra_Germination_8000_NoSpatial.csv'

try:
    df = pd.read_csv(path)
    print('rows', len(df))
    print('columns', df.columns.tolist())
    print(df.head(3).to_string())
except Exception as e:
    print('ERROR', e)
